<?php

namespace System\DashboardWidgets;

use Admin\Classes\BaseDashboardWidget;
use Exception;
use RecursiveDirectoryIterator;
use RecursiveIteratorIterator;
use System\Helpers\CacheHelper;

class Cache extends BaseDashboardWidget
{
    /**
     * @var string A unique alias to identify this widget.
     */
    protected $defaultAlias = 'cache';

    
    

    public function render()
    {
        $this->prepareVars();

        return $this->makePartial('cache/cache');
    }
    protected static function getCachePaths()
    {
        $domain = app('request')->getHost(); // Get the tenant's domain
    
        return [
            [
                'path' => "framework/views/$domain",
                'color' => '#2980b9',
            ],
            [
                'path' => "system/cache/$domain",
                'color' => '#16a085',
            ],
            [
                'path' => "framework/cache/data/tenant_" . str_replace(['.', ':'], '_', $domain) . "_cache",
                'color' => '#8e44ad',
            ],
            [
                'path' => "system/combiner/$domain",
                'color' => '#c0392b',
            ],
        ];
    }
    public function defineProperties()
    {
        return [
            'title' => [
                'label' => 'admin::lang.dashboard.label_widget_title',
                'default' => 'admin::lang.dashboard.text_cache_usage',
                'type' => 'text',
            ],
        ];
    }

    protected function prepareVars()
    {
        $totalCacheSize = 0;
        $cacheSizes = [];
        foreach (self::getCachePaths() as $cacheInfo) {
            $size = $this->folderSize(storage_path().'/'.$cacheInfo['path']);

            $cacheSizes[] = (object)[
                'label' => $cacheInfo['path'],
                'color' => $cacheInfo['color'],
                'size' => $size,
                'formattedSize' => $this->formatSize($size),
            ];

            $totalCacheSize += $size;
        }

        $this->vars['cacheSizes'] = $cacheSizes;
        $this->vars['totalCacheSize'] = $totalCacheSize;
        $this->vars['formattedTotalCacheSize'] = $this->formatSize($totalCacheSize);
    }

    public function onClearCache()
    {
        try {
           //
           //  dd(config('cache.prefix'));
            CacheHelper::clear();
        }
        catch (Exception $ex) {
            // ...
        }

        $this->prepareVars();

        return [
            '#'.$this->getId() => $this->makePartial('cache/cache'),
        ];
    }

    protected function formatSize($size)
    {
        return round($size / 1024, 0).' KB';
    }

    protected function folderSize($directory)
    {
        if (!is_dir($directory)) {
            return 0; // Return 0 if the directory does not exist
        }
        if (count(scandir($directory, SCANDIR_SORT_NONE)) == 2) {
            return 0;
        }

        $size = 0;

        foreach (new RecursiveIteratorIterator(new RecursiveDirectoryIterator($directory)) as $file) {
            $size += $file->getSize();
        }

        return $size;
    }
}
