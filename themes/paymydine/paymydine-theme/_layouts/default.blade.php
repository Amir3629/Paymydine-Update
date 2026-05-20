---
description: 'PayMyDine Default Layout'
---
<!DOCTYPE html>
<html lang="{{ App::getLocale() }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
    <title>{{ $this->page->title ?? 'PayMyDine' }}</title>
    <meta name="description" content="{{ $this->page->description ?? 'Modern restaurant ordering system' }}">
    
    <!-- Favicon -->
    <link rel="icon" type="image/svg+xml" href="/favicon.svg">
    
    <!-- Fonts -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    
    <!-- Next.js CSS -->
    <link rel="stylesheet" href="/_next/static/css/app.css">
    
    <!-- Theme Variables -->
    <style>
        :root {
            --primary-color: {{ $this->theme->primary_color ?? '#FF6B35' }};
            --secondary-color: {{ $this->theme->secondary_color ?? '#2D3748' }};
        }
    </style>
    
    <!-- Tenant Configuration -->
    <script>
        window.TENANT_CONFIG = {
            domain: '{{ request()->getHost() }}',
            apiBaseUrl: '{{ $this->theme->api_base_url ?? '/api' }}',
            tenant: '{{ request()->attributes->get('tenant')?->name ?? 'Restaurant' }}',
            enableDarkMode: {{ $this->theme->enable_dark_mode ? 'true' : 'false' }}
        };
    </script>
</head>
<body>
    <!-- React Root -->
    <div id="__next"></div>
    
    <!-- Next.js JavaScript -->
    <script src="/_next/static/chunks/webpack.js"></script>
    <script src="/_next/static/chunks/framework.js"></script>
    <script src="/_next/static/chunks/main.js"></script>
    <script src="/_next/static/chunks/pages/_app.js"></script>
    <script src="/_next/static/chunks/pages/index.js"></script>
    
    <!-- Initialize React App -->
    <script>
        // This will be handled by Next.js runtime
    </script>
</body>
</html> 