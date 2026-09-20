<?php

namespace Admin\Controllers;

use Admin\Classes\AdminController;
use Admin\Facades\AdminLocation;
use Admin\Facades\AdminMenu;
use Admin\Facades\Template;
use App\Services\GoogleBusiness\PmdGoogleBusinessService;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;

class Pmdgooglebusiness extends AdminController
{
    protected $requiredPermissions = ['Site.Settings'];

    public function __construct()
    {
        parent::__construct();

        try {
            AdminMenu::setContext('settings', 'system');
        } catch (\Throwable $error) {
        }
    }

    public function connect(PmdGoogleBusinessService $google)
    {
        return redirect()->away(
            $google->authorizationUrl(request()->getHost(), $this->currentLocationId())
        );
    }

    public function locations(PmdGoogleBusinessService $google)
    {
        Template::setTitle('Choose Google Business Profile');
        Template::setHeading('Choose Google Business Profile');

        $locationId = $this->currentLocationId();
        $this->vars['pmdGoogleBusiness'] = $google->status($locationId);
        $this->vars['pmdGoogleLocations'] = [];
        $this->vars['pmdGoogleError'] = null;

        try {
            $this->vars['pmdGoogleLocations'] = $google->listGoogleLocations($locationId);
        } catch (\Throwable $error) {
            $this->vars['pmdGoogleError'] = $error->getMessage();
        }

        return $this->makeView('pmdgooglebusiness/locations');
    }

    public function selectlocation(PmdGoogleBusinessService $google)
    {
        $input = request()->only(['account_name', 'location_name']);

        $validator = Validator::make($input, [
            'account_name' => ['required', 'string', 'max:191'],
            'location_name' => ['required', 'string', 'max:191'],
        ]);

        if ($validator->fails()) {
            throw new ValidationException($validator);
        }

        try {
            $google->selectLocation(
                $this->currentLocationId(),
                (string)$input['account_name'],
                (string)$input['location_name'],
                request()->getHost()
            );

            flash()->success('Google Business Profile connected and reviews synced.');
        } catch (\Throwable $error) {
            flash()->error($error->getMessage());

            return redirect(admin_url('pmdgooglebusiness/locations'));
        }

        return redirect(admin_url('pmdsettings/restaurant'));
    }

    public function sync(PmdGoogleBusinessService $google)
    {
        try {
            $result = $google->syncReviews($this->currentLocationId());
            flash()->success(
                'Google Reviews synced: '.(int)($result['synced'] ?? 0).' review(s).'
            );
        } catch (\Throwable $error) {
            flash()->error($error->getMessage());
        }

        return redirect(admin_url('reviews'));
    }

    public function refreshlinks(PmdGoogleBusinessService $google)
    {
        try {
            $google->refreshPlaceLinks($this->currentLocationId());
            flash()->success('Google Maps and review links refreshed.');
        } catch (\Throwable $error) {
            flash()->error($error->getMessage());
        }

        return redirect(admin_url('pmdsettings/restaurant'));
    }

    public function disconnect(PmdGoogleBusinessService $google)
    {
        try {
            $google->disconnect($this->currentLocationId());
            flash()->success('Google Business Profile disconnected.');
        } catch (\Throwable $error) {
            flash()->error($error->getMessage());
        }

        return redirect(admin_url('pmdsettings/restaurant'));
    }

    private function currentLocationId(): int
    {
        try {
            $location = AdminLocation::current();
            if ($location && (int)$location->location_id > 0) {
                return (int)$location->location_id;
            }
        } catch (\Throwable $error) {
        }

        try {
            $sessionId = (int)AdminLocation::getSession('id');
            if ($sessionId > 0) return $sessionId;
        } catch (\Throwable $error) {
        }

        return max(1, (int)params('default_location_id', 1));
    }
}
