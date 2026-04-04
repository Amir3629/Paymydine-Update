---
description: "Default layout"
---

<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title><?= $this->page->title ?? 'PayMyDine'; ?></title>
    @themeStyles
  </head>
  <body>
    @themePage
    @themeScripts
  </body>
  </html>

