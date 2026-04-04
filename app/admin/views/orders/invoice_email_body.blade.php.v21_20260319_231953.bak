<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
        }
        .content {
            background-color: #f9f9f9;
            padding: 20px;
            border-radius: 5px;
            margin-bottom: 20px;
        }
        .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
            font-size: 12px;
            color: #666;
        }
    </style>
</head>
<body>
    <div class="header">
        <h2>Thank you for your Visit!</h2>
    </div>
    
    <div class="content">
        <p>Dear {{ $model->customer_name }},</p>
        
        <p>Please find attached your invoice for Order #{{ $model->order_id }}.</p>
        
        <p><strong>Invoice Number:</strong> {{ $model->invoice_number }}</p>
        <p><strong>Order Date:</strong> {{ $model->order_date->format('F d, Y') }}</p>
        
        <p>You can open the attached invoice file in your browser and print or save it as PDF.</p>
        
        <p>If you have any questions about your order, please don't hesitate to contact us.</p>
    </div>
    
    <div class="footer">
        <p><strong>{{ $locationName }}</strong></p>
        @if($locationAddress)
            <p>{{ $locationAddress }}</p>
        @endif
        @if($locationPhone)
            <p>Phone: {{ $locationPhone }}</p>
        @endif
        <p>Best regards,<br>{{ $locationName }} Team</p>
    </div>
</body>
</html>
