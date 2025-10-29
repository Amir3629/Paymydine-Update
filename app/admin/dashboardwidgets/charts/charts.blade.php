<div class="dashboard-widget widget-charts">
    <h6 class="widget-title"><i class="stat-icon {{ $chartIcon }}"></i> @lang($chartLabel)</h6>
    <div
        class="chart-container"
        data-control="chart"
        data-alias="{{ $this->alias }}"
        data-type="{{ $chartType }}"
        data-data='@json($chartData)'
    >
        <div class="chart-canvas chart-{{ name_to_id($chartType) }} chart-{{ name_to_id($this->alias) }}">
            <canvas id="{{ $this->alias }}"></canvas>
        </div>
        
        <!-- Time Range Slider - Continuous from 7 to 90 days -->
        <div class="chart-time-slider" style="margin-top: 15px; padding: 0 15px;">
            <label style="font-size: 12px; color: #08815e; font-weight: 600; margin-bottom: 5px; display: block;">
                Time Range: <span id="{{ $this->alias }}-range-label">30 days</span>
            </label>
            <input 
                type="range" 
                id="{{ $this->alias }}-time-range" 
                min="7" 
                max="90" 
                value="30" 
                step="1"
                style="width: 100%; height: 6px; border-radius: 3px; background: linear-gradient(to right, #0bb87a, #08815e); outline: none; cursor: pointer;"
            >
            <div style="display: flex; justify-content: space-between; font-size: 11px; color: #202938; margin-top: 3px;">
                <span>7 days</span>
                <span>30 days</span>
                <span>90 days</span>
            </div>
        </div>
    </div>
</div>
