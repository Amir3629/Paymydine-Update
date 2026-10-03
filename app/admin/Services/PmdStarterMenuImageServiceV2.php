<?php

namespace Admin\Services;

/**
 * Compatibility alias for the original Quick Setup integration point.
 *
 * The stable class name is kept so existing onboarding code does not change,
 * while V6 adds a pre-warmable shared local cache in front of V5.1's
 * dish-aware Pexels resolver.
 */
class PmdStarterMenuImageServiceV2 extends PmdStarterMenuImageServiceV6
{
}
