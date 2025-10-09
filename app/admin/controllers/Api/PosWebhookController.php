<?php

namespace Admin\Controllers\Api;

use Admin\Models\Orders_model;
use Admin\Models\Statuses_model;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Log;

class PosWebhookController extends Controller
{
    /*
    public function handle(Request $request)
    {
        try {
            $payload = $request->all();

            Log::info('Webhook recebido do POS', $payload);

            // Exemplo de normalização
            $orderData = [
                'first_name'   => $payload['data']['customer']['first_name'] ?? 'Guest',
                'last_name'    => $payload['data']['customer']['last_name'] ?? '',
                'email'        => $payload['data']['customer']['email'] ?? null,
                'telephone'    => $payload['data']['customer']['phone'] ?? null,
                'location_id'  => $this->mapLocation($payload['data']['location_id']),
                'order_total'  => $payload['data']['total'] ?? 0,
                'order_type'   => 'pos',
                'status_id'    => Statuses_model::where('status_name', 'New')->value('status_id'),
                'created_at'   => now(),
                'updated_at'   => now(),
            ];

            // Criar ou atualizar pedido
            $order = Orders_model::updateOrCreate(
                ['hash' => $payload['data']['id']], // identificador único
                $orderData
            );

            return response()->json(['success' => true, 'order_id' => $order->order_id], 200);

        } catch (\Exception $e) {
            Log::error('Erro no webhook do POS: '.$e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return response()->json(['error' => true, 'message' => $e->getMessage()], 500);
        }
    }*/

public function handle(Request $request)
{
    try {
        $payload = $request->all();
        Log::info('Webhook POS recebido', $payload);

        // Se veio do SquareService, o pedido completo está em full_order.order
        $orderObj = $payload['full_order']['order'] ?? null;
        if (!$orderObj) {
            Log::warning('Payload POS recebido sem order', $payload);
            return response()->json([
                'error' => true,
                'message' => 'Payload inválido, order não encontrado'
            ], 400);
        }

        // Monta os dados do pedido
        $orderData = [
            'hash'        => $orderObj['id'],
            'location_id' => $orderObj['location_id'] ?? 1,
            'order_total' => $orderObj['total_money']['amount'] ?? 0,
            'order_type'  => 'pos',
            'status_id'   => Statuses_model::where('status_name', 'New')->value('status_id'),
            'created_at'  => now(),
            'updated_at'  => now(),
        ];

        // Se houver customer_id, você pode tentar pegar informações do cliente
        if (!empty($orderObj['customer_id'])) {
            // Aqui você pode usar uma função que busca o cliente via API do Square
            $customerId = $orderObj['customer_id'];
            
            // Exemplo: se você tiver os dados do cliente no payload (ou buscados antes)
            $customerData = $payload['customer'] ?? []; // ou busca via API

            $orderData['first_name'] = $customerData['first_name'] ?? 'Guest';
            $orderData['last_name']  = $customerData['last_name'] ?? '';
            $orderData['email']      = $customerData['email'] ?? null;
            $orderData['telephone']  = $customerData['phone'] ?? null;
        }

        // Salva ou atualiza no banco
        $order = Orders_model::updateOrCreate(
            ['hash' => $orderData['hash']],
            $orderData
        );

        Log::info("Pedido POS salvo: order_id {$order->order_id}");

        return response()->json([
            'success' => true,
            'order_id' => $order->order_id,
        ], 200);

    } catch (\Exception $e) {
        Log::error('Erro ao processar webhook POS: ' . $e->getMessage(), [
            'trace' => $e->getTraceAsString(),
        ]);

        return response()->json([
            'error' => true,
            'message' => $e->getMessage(),
        ], 500);
    }
}

    private function mapLocation($posLocationId)
    {
        // Aqui você pode fazer um lookup na tabela pos_integrations
        // para mapear o location_id do POS para o location_id interno do seu restaurante
        return \Admin\Models\Locations_model::first()->location_id ?? 1;
    }
}
