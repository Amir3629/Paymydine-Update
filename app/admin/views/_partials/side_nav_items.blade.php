@php
    $pmdIsRootMenu = isset($navAttributes['id']) && $navAttributes['id'] === 'side-nav-menu';

    $pmdClean = function ($value) {
        $value = strip_tags((string)$value);
        $value = str_replace(['⚡', '&amp;'], ['', '&'], $value);
        $value = preg_replace('/\s+/', ' ', $value);
        return trim($value);
    };

    $pmdKey = function ($value) use ($pmdClean) {
        return mb_strtolower($pmdClean($value));
    };

    $pmdLabel = function ($code, $menu) use ($pmdClean) {
        return $pmdClean($menu['title'] ?? $code);
    };

    $pmdMatches = function ($code, $menu, array $needles) use ($pmdKey, $pmdLabel) {
        $haystack = $pmdKey($code.' '.($menu['class'] ?? '').' '.$pmdLabel($code, $menu));

        foreach ($needles as $needle) {
            if (strpos($haystack, $pmdKey($needle)) !== false) {
                return true;
            }
        }

        return false;
    };

    if ($pmdIsRootMenu) {
        $root = $navItems;
        $ordered = [];
        $systemChildren = [];

        $put = function (&$target, $code, $menu) {
            if (!$code || !$menu) {
                return;
            }

            $target[$code] = $menu;
        };

        $takeRoot = function (array $needles) use (&$root, $pmdMatches) {
            foreach ($root as $code => $menu) {
                if ($pmdMatches($code, $menu, $needles)) {
                    unset($root[$code]);
                    return [$code, $menu];
                }
            }

            return [null, null];
        };

        $takeChildAnywhere = function (array $needles, array $parentNeedles = []) use (&$root, $pmdMatches) {
            foreach ($root as $parentCode => &$parentMenu) {
                if ($parentNeedles && !$pmdMatches($parentCode, $parentMenu, $parentNeedles)) {
                    continue;
                }

                if (!isset($parentMenu['child']) || !is_array($parentMenu['child'])) {
                    continue;
                }

                foreach ($parentMenu['child'] as $childCode => $childMenu) {
                    if ($pmdMatches($childCode, $childMenu, $needles)) {
                        unset($parentMenu['child'][$childCode]);
                        return [$childCode, $childMenu];
                    }
                }
            }

            return [null, null];
        };

        $moveChildrenToSystem = function ($menu) use (&$systemChildren, $put) {
            if (!isset($menu['child']) || !is_array($menu['child'])) {
                return;
            }

            foreach ($menu['child'] as $childCode => $childMenu) {
                $put($systemChildren, $childCode, $childMenu);
            }
        };

        // Dashboard
        [$code, $menu] = $takeRoot(['dashboard']);
        $put($ordered, $code, $menu);

        // Important one-click buttons from Sales
        [$code, $menu] = $takeChildAnywhere(['orders'], ['sales']);
        $put($ordered, $code, $menu);

        [$code, $menu] = $takeChildAnywhere(['reservations'], ['sales']);
        $put($ordered, $code, $menu);

        [$code, $menu] = $takeChildAnywhere(['coupons', 'gift cards', 'gift'], ['marketing', 'sales']);
        if ($menu) {
            $menu['title'] = 'Coupons & Gifts';
        }
        $put($ordered, $code, $menu);

        // Restaurant with ordered restaurant children
        [$restaurantCode, $restaurantMenu] = $takeRoot(['restaurant']);
        if ($restaurantMenu) {
            $restaurantChildren = $restaurantMenu['child'] ?? [];
            $newRestaurantChildren = [];

            $restaurantOrder = [
                ['locations', 'location'],
                ['menu items', 'menus', 'menu'],
                ['categories', 'category'],
                ['mealtimes', 'meal times', 'mealtime'],
                ['tables', 'table'],
            ];

            foreach ($restaurantOrder as $needles) {
                foreach ($restaurantChildren as $childCode => $childMenu) {
                    if ($pmdMatches($childCode, $childMenu, $needles)) {
                        $newRestaurantChildren[$childCode] = $childMenu;
                        unset($restaurantChildren[$childCode]);
                        break;
                    }
                }
            }

            foreach ($restaurantChildren as $childCode => $childMenu) {
                $newRestaurantChildren[$childCode] = $childMenu;
            }

            $restaurantMenu['child'] = $newRestaurantChildren;
            $put($ordered, $restaurantCode, $restaurantMenu);
        }

        // Kitchen Display as one-click from Tools
        [$code, $menu] = $takeChildAnywhere(['kitchen display'], ['tools']);
        if (!$menu) {
            [$code, $menu] = $takeChildAnywhere(['manage kds', 'kds'], ['tools']);
        }
        if ($menu) {
            $menu['title'] = 'Kitchen Display';
            unset($menu['child']);
        }
        $put($ordered, $code, $menu);

        // Design and Marketing stay root
        [$code, $menu] = $takeRoot(['design']);
        $put($ordered, $code, $menu);

        [$code, $menu] = $takeRoot(['marketing']);
        $put($ordered, $code, $menu);

        // Existing System base
        [$systemCode, $systemMenu] = $takeRoot(['system']);
        if (!$systemMenu) {
            $systemCode = 'system';
            $systemMenu = [
                'title' => 'System',
                'class' => 'system',
                'href' => '#',
                'icon' => 'fa-cog',
                'child' => [],
            ];
        }

        // Keep existing System children first
        if (isset($systemMenu['child']) && is_array($systemMenu['child'])) {
            foreach ($systemMenu['child'] as $childCode => $childMenu) {
                $put($systemChildren, $childCode, $childMenu);
            }
        }

        // Move all remaining root groups/items under System, so nothing is removed
        foreach ($root as $leftCode => $leftMenu) {
            if (isset($leftMenu['child']) && is_array($leftMenu['child']) && count($leftMenu['child'])) {
                $moveChildrenToSystem($leftMenu);
            } else {
                $put($systemChildren, $leftCode, $leftMenu);
            }
        }

        $systemMenu['child'] = $systemChildren;
        $put($ordered, $systemCode, $systemMenu);

        $navItems = $ordered;
    }
@endphp

<ul {!! isset($navAttributes) ? Html::attributes($navAttributes) : '' !!}>
    @foreach($navItems as $code => $menu)
        @if(isset($menu['child']) && empty($menu['child']))
            @continue;
        @endif

        @php
            $hasChild = isset($menu['child']) && count($menu['child']);
            $isActive = $this->isActiveNavItem($code);
            $menuClass = $menu['class'] ?? $code;
            $title = $pmdClean($menu['title'] ?? $code);
            $iconKey = $pmdKey($code.' '.$menuClass.' '.$title);

            $icon = 'fa-circle-o';

            if (strpos($iconKey, 'dashboard') !== false) $icon = 'fa-home';
            elseif (strpos($iconKey, 'restaurant') !== false) $icon = 'fa-cutlery';
            elseif (strpos($iconKey, 'location') !== false) $icon = 'fa-map-marker';
            elseif (strpos($iconKey, 'menu item') !== false || strpos($iconKey, 'menus') !== false || $iconKey === 'menu') $icon = 'fa-book';
            elseif (strpos($iconKey, 'categor') !== false) $icon = 'fa-list-ul';
            elseif (strpos($iconKey, 'mealtime') !== false || strpos($iconKey, 'meal time') !== false) $icon = 'fa-clock-o';
            elseif (strpos($iconKey, 'table') !== false) $icon = 'fa-th-large';

            elseif (strpos($iconKey, 'order') !== false || strpos($iconKey, 'sale') !== false) $icon = 'fa-shopping-cart';
            elseif (strpos($iconKey, 'reservation') !== false) $icon = 'fa-calendar-check-o';
            elseif (strpos($iconKey, 'status') !== false) $icon = 'fa-tasks';
            elseif (strpos($iconKey, 'payment') !== false || strpos($iconKey, 'terminal') !== false || strpos($iconKey, 'credit') !== false) $icon = 'fa-credit-card';
            elseif (strpos($iconKey, 'tip') !== false) $icon = 'fa-percent';
            elseif (strpos($iconKey, 'coupon') !== false || strpos($iconKey, 'gift') !== false) $icon = 'fa-gift';

            elseif (strpos($iconKey, 'marketing') !== false || strpos($iconKey, 'promotion') !== false) $icon = 'fa-bullhorn';
            elseif (strpos($iconKey, 'design') !== false || strpos($iconKey, 'theme') !== false) $icon = 'fa-paint-brush';
            elseif (strpos($iconKey, 'mail') !== false || strpos($iconKey, 'template') !== false) $icon = 'fa-envelope-o';

            elseif (strpos($iconKey, 'kitchen display') !== false || strpos($iconKey, 'kds') !== false) $icon = 'fa-television';
            elseif (strpos($iconKey, 'media') !== false) $icon = 'fa-picture-o';
            elseif (strpos($iconKey, 'review') !== false) $icon = 'fa-comments';

            elseif (strpos($iconKey, 'localisation') !== false || strpos($iconKey, 'localization') !== false || strpos($iconKey, 'language') !== false) $icon = 'fa-globe';
            elseif (strpos($iconKey, 'currenc') !== false) $icon = 'fa-money';
            elseif (strpos($iconKey, 'countr') !== false) $icon = 'fa-flag-o';

            elseif (strpos($iconKey, 'quick') !== false) $icon = 'fa-bolt';
            elseif (strpos($iconKey, 'staff') !== false || strpos($iconKey, 'user') !== false) $icon = 'fa-user-circle';
            elseif (strpos($iconKey, 'log') !== false) $icon = 'fa-file-text-o';
            elseif (strpos($iconKey, 'pos') !== false || strpos($iconKey, 'sync') !== false) $icon = 'fa-cogs';
            elseif (strpos($iconKey, 'system') !== false || strpos($iconKey, 'setting') !== false) $icon = 'fa-cog';
            elseif (strpos($iconKey, 'tool') !== false) $icon = 'fa-wrench';
        @endphp

        <li class="nav-item{{ (!$hasChild && $isActive) ? ' active' : '' }}{{ ($hasChild && $isActive) ? ' open' : '' }}">
            <a
                class="nav-link{{ isset($menu['class']) ? ' '.$menu['class'] : '' }}"
                href="{{ $hasChild ? '#' : ($menu['href'] ?: '#') }}"
                @if($hasChild)
                    data-toggle="collapse"
                    data-target="#collapse-{{ $code }}"
                @endif
                aria-expanded="{{ $isActive ? 'true' : 'false' }}"
            >
                <i class="fa {{ $icon }} fa-fw" aria-hidden="true"></i>
                <span class="content">{{ $title }}</span>
            </a>

            @if($hasChild)
                {!! $this->makePartial('side_nav_items', [
                    'navItems'      => $menu['child'],
                    'navAttributes' => [
                        'id'            => 'collapse-'.$code,
                        'class'         => 'nav collapse'.($isActive ? ' show' : ''),
                        'aria-expanded' => $isActive ? 'true' : 'false',
                    ],
                ]) !!}
            @endif
        </li>
    @endforeach
</ul>
