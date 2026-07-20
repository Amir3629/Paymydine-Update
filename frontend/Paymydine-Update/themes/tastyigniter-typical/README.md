# Typical for TastyIgniter

**Typical for TastyIgniter** is an elegant and modern theme for the TastyIgniter e-commerce platform. Designed with attention to detail and an intuitive user interface, Typical offers an exceptional shopping experience for users.

This `readme.md` file provides basic information about the Typical theme for TastyIgniter, including installation and customization instructions.

## Prerequisites

- TastyIgniter 3.6.x or higher.

## Installation

To automatically install the Typical theme in TastyIgniter, follow these steps:

1. Purchase the Typical theme through the [TastyIgniter marketplace](https://tastyigniter.com/marketplace/item/tastyigniter-typical).
2. Log in to your TastyIgniter admin panel.
3. Go to the "Design" section and click on "Themes".
4. Under the "Marketplace" tab, you should see the Typical theme listed.
5. Click on the "Install" button next to the Typical theme.
6. TastyIgniter will automatically download and install the Typical theme for you.
7. Once the installation is complete, click on the "Activate" button to activate the Typical theme.

### Enable Reservations on the Root of the Website

To enable reservations on the root of the website, follow these steps:

1. Locate the file `extensions/igniter/reservation/components/Booking.php` in your TastyIgniter installation.
2. Open the `Booking.php` file and find line 112.
3. Add the following code at line 112:

   ```php
   'defaultLocationParam' => [
       'label' => 'The default location route parameter',
       'type' => 'text',
       'default' => 'local',
       'validationRule' => 'string',
   ],
   ```
4. Scroll to the bottom of the file and replace the checkLocationParam function with the following code:
   
   ```php
    protected function checkLocationParam()
    {
        $param = $this->param('location');
        if (!empty($param) && Locations_model::whereSlug($param)->exists()) {
            return;
        } else {
            $defaultLocationSlug = $this->property('defaultLocationParam', 'local'); 
            if (Locations_model::whereSlug($defaultLocationSlug)->exists()) {
                return;
            } else {
                return Redirect::to($this->controller->pageUrl($this->property('localNotFoundPage')));
            }
        }
        
    }
   ```
5. Save the file to apply the changes.

## Customization

You can customize the Typical theme according to your needs. Here are some common customization options:

1. Log in to your TastyIgniter admin panel.
2. Go to the "Design" section and click on "Themes".
3. Click on the "Customize" button next to the Typical theme.
4. You will be presented with various customization options, such as colors, fonts, layout, and more.
5. To customize the "Our History" section:
   - Introduction: Edit the introduction text in the customization options.
   - Title: Modify the title of the section in the customization options.
   - Year: Update the year in the customization options.
   - Image: Replace the image with your own image in the customization options.
6. Make your desired changes and click on the "Save" button to apply them.

## Support

If you have any questions, issues, or suggestions related to the Typical theme for TastyIgniter, you can seek help from the [official Typical Support](https://forum.tastyigniter.com/d/3026-tastyigniter-typical-theme/11). You can also refer to the TastyIgniter documentation for more information on theme customization and usage.

## Contributions

Currently, direct contributions to the Typical theme are limited to developers authorized by the theme creator. If you have any suggestions or have encountered any issues, you can share them through the [TastyIgniter Typical](https://forum.tastyigniter.com/d/3026-tastyigniter-typical-theme/11) or contact the theme creator.

## License

Typical for TastyIgniter is distributed under the terms and conditions of the TastyIgniter marketplace. Please refer to the marketplace for more information regarding rights and usage limitations.

---

Enjoy the Typical theme for TastyIgniter that you purchased through the TastyIgniter marketplace. We hope it provides a pleasant experience for both administrators and users of your online store. If you have any additional questions or need assistance, feel free to consult the documentation or seek support from the TastyIgniter community.
