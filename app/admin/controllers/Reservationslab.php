<?php

namespace Admin\Controllers;

use Admin\Classes\PmdCleanWorkspaceControllerV1;
use Admin\Services\PmdCleanWorkspaceSharedV1;
use Admin\Services\PmdReservationsLabScheduleV1;
use Admin\Services\ReservationComposerService;

/** Clean Reservations workspace: shared shell + reservation KPIs + Floor + clean schedule tools. */
class Reservationslab extends PmdCleanWorkspaceControllerV1
{
    protected $requiredPermissions = 'Admin.Reservations';

    public function __construct()
    {
        parent::__construct();
        $this->addCss('css/pmd-reservations-lab-schedule-v1.css');
        $this->addJs('js/pmd-reservations-lab-schedule-v1.js');
    }

    protected function pmdWorkspaceKey(): string
    {
        return 'reservations';
    }

    protected function pmdKpiMode(): string
    {
        return 'reservations';
    }

    protected function pmdKpiDefaults(): array
    {
        return [
            'reservations_today',
            'upcoming_arrivals',
            'available_tables',
            'table_occupancy',
        ];
    }

    protected function pmdMenuContext(): array
    {
        return ['reservations', 'sales'];
    }

    protected function pmdAfterFloorPartial(): ?string
    {
        return 'admin::_partials.pmd_reservations_lab_schedule_v1';
    }

    protected function pmdPrepareWorkspaceVars(
        PmdCleanWorkspaceSharedV1 $shared,
        string $locale,
        array $floorBootstrap
    ): void {
        /** @var PmdReservationsLabScheduleV1 $schedule */
        $schedule = app(PmdReservationsLabScheduleV1::class);
        $this->vars['pmdReservationsLabSchedule'] = $schedule->payload(
            $shared->locationId(),
            $locale
        );
    }

    public function onLoadReservationComposer()
    {
        return app(ReservationComposerService::class)->load(request()->all());
    }

    public function onCheckReservationAvailability()
    {
        return app(ReservationComposerService::class)->availability(request()->all());
    }

    public function onSaveReservationComposer()
    {
        return app(ReservationComposerService::class)->save(request()->all());
    }
}
