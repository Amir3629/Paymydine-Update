<?php

namespace Admin\Controllers;

use Admin\ActivityTypes\StatusUpdated;
use Admin\Facades\AdminMenu;
use Admin\Models\Reservations_model;
use Admin\Models\Statuses_model;
use Igniter\Flame\Exception\ApplicationException;

/**
 * Clean Reservations workspace.
 *
 * Keeps the native reservation model and permissions while providing the
 * isolated /admin/reservations2 floor-and-card workflow.
 */
class Reservations2 extends Reservations
{
    public function __construct()
    {
        parent::__construct();

        AdminMenu::setContext('reservations', 'sales');
    }

    public function index()
    {
        $this->asExtension('ListController')->index();

        $statuses = Statuses_model::getDropdownOptionsForReservation();

        $this->vars['statusesOptions'] = $statuses;
        $this->vars['pmdReservationStatuses'] = $statuses;
        $this->vars['pmdReservations2'] = Reservations_model::query()
            ->with(['tables', 'status'])
            ->orderBy('reservation_id', 'desc')
            ->limit(250)
            ->get();
    }

    /**
     * Reservation-card status actions used by the Reservations2 workspace.
     */
    public function index_onPmdReservationAction()
    {
        if (!$this->getUser()->hasPermission('Admin.Reservations')) {
            throw new ApplicationException(lang('admin::lang.alert_user_restricted'));
        }

        $recordId = (int)post('recordId');
        $action = strtolower(trim((string)post('action')));

        if (!$recordId || !in_array($action, ['arrive', 'seat', 'cancel'], true)) {
            throw new ApplicationException('Invalid reservation action.');
        }

        $reservation = Reservations_model::query()
            ->with(['tables', 'status'])
            ->find($recordId);

        if (!$reservation) {
            throw new ApplicationException('Reservation not found.');
        }

        $status = $this->resolveWorkspaceStatus($action);

        if (!$status) {
            $available = Statuses_model::isForReservation()
                ->pluck('status_name')
                ->filter()
                ->implode(', ');

            throw new ApplicationException(
                'No compatible reservation status exists for this action.'.
                ($available ? ' Available statuses: '.$available : '')
            );
        }

        if ((int)$reservation->status_id !== (int)$status->status_id) {
            if ($action === 'seat' || $action === 'cancel') {
                $reservation->processed = true;
            }

            if ($record = $reservation->addStatusHistory($status)) {
                StatusUpdated::log($record, $this->getUser());
            }
        }

        $freshReservation = Reservations_model::query()
            ->with(['tables', 'status'])
            ->find($recordId);

        $messages = [
            'arrive' => 'Guest marked as arrived.',
            'seat' => 'Guest marked as seated.',
            'cancel' => 'Reservation cancelled.',
        ];

        return response()->json([
            'reservation' => $freshReservation ? $freshReservation->toArray() : $reservation->toArray(),
            'message' => $messages[$action],
            'status' => $status->status_name,
        ]);
    }

    public function index_onDelete()
    {
        if (!$this->getUser()->hasPermission('Admin.DeleteReservations')) {
            throw new ApplicationException(lang('admin::lang.alert_user_restricted'));
        }

        return $this->asExtension('Admin\Actions\ListController')->index_onDelete();
    }

    /**
     * Resolve actions against the tenant's existing reservation statuses.
     * No statuses are created or renamed by this workspace.
     */
    protected function resolveWorkspaceStatus(string $action)
    {
        $statuses = Statuses_model::isForReservation()->get();

        $aliases = [
            'arrive' => [
                'arrived',
                'checked in',
                'checked-in',
                'check in',
                'confirmed',
                'approved',
            ],
            'seat' => [
                'seated',
                'occupied',
                'completed',
                'complete',
                'finished',
            ],
            'cancel' => [
                'cancelled',
                'canceled',
                'declined',
                'rejected',
            ],
        ];

        $wanted = $aliases[$action] ?? [];

        foreach ($wanted as $alias) {
            $exact = $statuses->first(function ($status) use ($alias) {
                return strtolower(trim((string)$status->status_name)) === $alias;
            });

            if ($exact) {
                return $exact;
            }
        }

        foreach ($wanted as $alias) {
            $partial = $statuses->first(function ($status) use ($alias) {
                return str_contains(
                    strtolower(trim((string)$status->status_name)),
                    $alias
                );
            });

            if ($partial) {
                return $partial;
            }
        }

        return null;
    }
}
