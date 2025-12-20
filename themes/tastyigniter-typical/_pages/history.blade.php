---
title: Our History
layout: default
permalink: /our-history

'[localSearch]':

'[localMenu]':
    forceRedirect: 0
---
@if($this->theme->enable_history)
    @partial('breadcrumb')

    <div class="col-full">
        <div class="row py-4">
            <div class="history-section" style="width: 1366px;">
            <div class="history-container">
                <div class="history-containera">
                    <div class="history-containerb">
                        <div class="history-heading-title">                
                            <h4 class="history-heading-title-h2">{{$this->theme->title_history}}</h4>   
                        </div>    
                        
                        <div class="history-heading-title2">
                            <div class="history-heading-title2a">
                                <h2 class="history-heading-title2b">{{$this->theme->subtitle_history}}</h2>
                            </div>
                        </div>
                        <div class="history-heading-text">
                            <div class="history-heading-text2">
                                <div class="history-heading-text3">
                                    {{$this->theme->introduction_history}}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            </div>
            
            <div class="history-second-section" style="width: 1366px;">
                <div class="history-second-sectiona">
                    <div class="history-second-section-row ">
                        <div class="history-second-section-column">
                            <div class="history-second-section-column-wrap">
                                <div class="history-second-section-column-widget-wrap">
                                    <div class="history-second-section-heading">
                                        <div class="history-second-section-heading2">
                                            <h3 class="history-heading-title2b">Nuestra Historia</h3>
                                        </div>
                                    </div>
                                    <div class="history-heading-title">
                                        <div class="history-signature2">
                                            <div class="history-timeline-wrapper">
                                                @foreach ($historyItems = $this->theme->history_repeater ?? [] as $history)
                                                <div class="history-item">
                                                    <div class="history-thumbnail">
                                                        <img class=" lazyloaded" src="{{ uploads_url(array_get($history, 'year_image')) }}" title="history_{{ array_get($history, 'year') }}" alt="history_{{ array_get($history, 'year') }}" width="649" height="370">
                                                    </div>
                                                    <div class="history-content-wrap">
                                                        <div class="history-inner">
                                                            <div class="history-thumbnail-mobile"> 
                                                                <img class="lazyload" src="{{ uploads_url(array_get($history, 'year_image')) }}" title="history_{{ array_get($history, 'year') }}" alt="history_{{ array_get($history, 'year') }}">
                                                            </div>
                                                            <div class="history-number-wrap">
                                                                <div class="history-inner"> 
                                                                    <span class="history-line"></span>
                                                                    <span class="history-number">{{ array_get($history, 'year') }}</span>
                                                                </div>
                                                            </div>
                                                            <div class="history-content">
                                                                <h3 class="history-title">{{ array_get($history, 'year_title') }}</h3>
                                                                <div class="description">{{ array_get($history, 'year_description') }}</div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                                @endforeach
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div> 
        </div>
    </div>
@else
    <h1 class="col-full row justify-content-center d-flex p-5">Page No found</h1>
@endif       