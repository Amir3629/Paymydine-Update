<div id="{{ $this->getId() }}" class="dashboard-widget widget-cache">
    <h6 class="widget-title">@lang($this->property('title'))</h6>

    <div class="cache-donut">
        <span class="cache-total-text">
            <span class="cache-label">{{ __('Cache') }}</span>
            <b>{{ $formattedTotalCacheSize }}</b>
        </span>
    <div class="progress mb-3" style="height: 25px;">
        @foreach ($cacheSizes as $cacheInfo)
            <div
                class="progress-bar p-2"
                role="progressbar"
                data-bs-toggle="tooltip"
                data-bs-placement="top"
                title="{{ $cacheInfo->label }}"
                data-cache-label="{{ $cacheInfo->label }}"
                data-cache-size="{{ $cacheInfo->formattedSize }}"
                aria-valuenow="{{ $cacheInfo->size }}"
                aria-valuemin="0"
                aria-valuemax="{{ $totalCacheSize }}"
                style="{{ 'background-color: '.$cacheInfo->color.'; width: '.$cacheInfo->size.'%' }}"
            ><b>{{ $cacheInfo->formattedSize }}</b></div>
        @endforeach
        </div>
    </div>
    <button
        type="button"
        data-request="{{ $this->getEventHandler('onClearCache') }}"
        data-request-success="$('#cache-sizes').replaceWith(data.partial)"
        class="btn btn-default"
    ><i class="fa fa-trash"></i>&nbsp;&nbsp;@lang('admin::lang.text_clear')</button>
</div>

<script>
(function() {
    'use strict';

    function initializeCacheDonutChart() {
        const cacheWidget = document.getElementById('{{ $this->getId() }}');
        if (!cacheWidget) return;

        const progressBars = cacheWidget.querySelectorAll('.progress-bar');
        const progressContainer = cacheWidget.querySelector('.progress');
        if (progressBars.length === 0 || !progressContainer) return;

        // Get cache data: sizes, colors, and labels
        const bluePalette = ['#203864', '#2f5496', '#4a75c3'];
        const cacheData = [];
        let totalSize = 0;

        progressBars.forEach((bar, index) => {
            const size = parseInt(bar.getAttribute('aria-valuenow')) || 0;
            const paletteColor = bluePalette[index % bluePalette.length] || '#2f5496';
            const color = paletteColor;
            const fullLabel = bar.getAttribute('data-cache-label') || 'Unknown';
            const formattedSize = bar.getAttribute('data-cache-size') || '0 KB';
            bar.style.backgroundColor = color;
            
            // Extract short label (e.g., "views" from "framework/views/127.0.0.1")
            const labelParts = fullLabel.split('/');
            const shortLabel = labelParts[1] || labelParts[0] || 'cache';
            
            cacheData.push({ size, color, label: shortLabel, formattedSize });
            totalSize += size;
        });

        // 3 separate slices with gaps: each slice is 115deg, gap is 5deg (total 120deg per section)
        const sliceAngle = 115; // degrees for each slice (360/3 = 120, minus 5 for gap)
        const gapAngle = 5;     // degrees for gap between slices
        const sectionAngle = sliceAngle + gapAngle; // 120 degrees total per section
        const separationDistance = 6; // pixels to move each slice outward (reduced for smaller chart)

        // Fixed maximum capacity per cache type (in bytes)
        // Adjust these values based on your typical cache sizes
        const maxCapacity = 500000; // 500KB - adjust this if needed

        progressBars.forEach((bar, index) => {
            const cache = cacheData[index];
            const startAngle = index * sectionAngle; // 0, 90, 180, 270
            
            // Calculate ACTUAL fill percentage for THIS slice (0-100%)
            // Based on its size relative to max capacity, not relative to other slices
            const fillPercentage = Math.min((cache.size / maxCapacity) * 100, 100);
            
            // Calculate how much of the 85deg slice should be filled with bright color
            // 0% = 0deg (all brown), 100% = 85deg (all bright color)
            const fillAngle = (fillPercentage / 100) * sliceAngle;
            
            // Calculate the middle angle of this slice for translation direction
            const middleAngle = startAngle + (sliceAngle / 2); // 42.5, 132.5, 222.5, 312.5
            const radians = (middleAngle - 90) * (Math.PI / 180); // Convert to radians, adjust for top start
            
            // Calculate x and y translation to move slice outward
            const translateX = Math.cos(radians) * separationDistance;
            const translateY = Math.sin(radians) * separationDistance;
            
            // Set CSS variables for this slice
            bar.style.setProperty('--start-angle', startAngle + 'deg');
            bar.style.setProperty('--slice-size', sliceAngle + 'deg');
            bar.style.setProperty('--fill-angle', fillAngle + 'deg');
            bar.style.setProperty('--slice-color', cache.color);
            bar.style.setProperty('--translate-x', translateX + 'px');
            bar.style.setProperty('--translate-y', translateY + 'px');
            
        });
        
        // Create SVG for curved text labels
        // Remove old SVG if exists
        const oldSvg = progressContainer.querySelector('.cache-labels-svg');
        if (oldSvg) oldSvg.remove();
        
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('class', 'cache-labels-svg');
        svg.setAttribute('viewBox', '0 0 300 300');
        svg.style.position = 'absolute';
        svg.style.top = '0';
        svg.style.left = '0';
        svg.style.width = '100%';
        svg.style.height = '100%';
        svg.style.pointerEvents = 'none';
        svg.style.zIndex = '100';
        
        cacheData.forEach((cache, index) => {
            const startAngle = index * sectionAngle;
            const midAngle = startAngle + (sliceAngle / 2);
            
            // Create circular path for text to follow
            const pathRadius = 95; // radius for text path
            const pathId = `textPath${index}`;
            
            // Check if text should be flipped (bottom half of circle = angles 90-270)
            const shouldFlip = midAngle > 90 && midAngle < 270;
            
            // Create path (arc) - INSIDE the donut for bottom, OUTSIDE for top
            const pathRadiusAdjusted = shouldFlip ? 105 : 95; // Move bottom text to inside of donut
            
            const startRad = (startAngle + 10) * (Math.PI / 180);
            const endRad = (startAngle + sliceAngle - 10) * (Math.PI / 180);
            
            let x1 = 150 + pathRadiusAdjusted * Math.cos(startRad - Math.PI / 2);
            let y1 = 150 + pathRadiusAdjusted * Math.sin(startRad - Math.PI / 2);
            let x2 = 150 + pathRadiusAdjusted * Math.cos(endRad - Math.PI / 2);
            let y2 = 150 + pathRadiusAdjusted * Math.sin(endRad - Math.PI / 2);
            
            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            path.setAttribute('id', pathId);
            
            // For bottom slice, reverse path direction so text reads left-to-right when flipped
            if (shouldFlip) {
                path.setAttribute('d', `M ${x2} ${y2} A ${pathRadiusAdjusted} ${pathRadiusAdjusted} 0 0 0 ${x1} ${y1}`);
            } else {
                path.setAttribute('d', `M ${x1} ${y1} A ${pathRadiusAdjusted} ${pathRadiusAdjusted} 0 0 1 ${x2} ${y2}`);
            }
            path.setAttribute('fill', 'none');
            
            const defs = svg.querySelector('defs') || document.createElementNS('http://www.w3.org/2000/svg', 'defs');
            if (!svg.querySelector('defs')) svg.appendChild(defs);
            defs.appendChild(path);
            
            // Create text element
            const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            text.setAttribute('fill', 'white');
            text.setAttribute('font-size', '11');
            text.setAttribute('font-weight', 'bold');
            text.setAttribute('text-anchor', 'middle');
            text.setAttribute('class', 'cache-curved-label');
            
            const textPath = document.createElementNS('http://www.w3.org/2000/svg', 'textPath');
            textPath.setAttributeNS('http://www.w3.org/1999/xlink', 'href', `#${pathId}`);
            textPath.setAttribute('startOffset', '50%');
            textPath.textContent = `${cache.label} ${cache.formattedSize}`;
            
            text.appendChild(textPath);
            svg.appendChild(text);
        });
        
        progressContainer.appendChild(svg);
    }

    // Initialize on page load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeCacheDonutChart);
    } else {
        initializeCacheDonutChart();
    }

    // Re-initialize after this widget loads
    setTimeout(initializeCacheDonutChart, 100);
})();
</script>
