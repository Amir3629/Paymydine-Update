<div class="pmd-whatsapp-inbox" style="max-width:1080px;margin:26px auto;padding:0 16px">
    <header style="display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:20px">
        <div>
            <h2 style="margin:0 0 6px">WhatsApp Inbox</h2>
            <p style="margin:0;color:#667985">Messages for the selected restaurant location only.</p>
        </div>
        <a href="{{ admin_url('pmdsettings/restaurant') }}" class="btn btn-default">Restaurant settings</a>
    </header>

    <div id="pmd-wa-reply-status" aria-live="polite"></div>
    @if(empty($pmdWhatsAppInstalled))
        <div class="alert alert-warning" role="alert">
            WhatsApp Inbox is not installed yet. Ask the PayMyDine administrator to install and link a Meta channel.
        </div>
    @elseif(empty($pmdWhatsAppMessages))
        <div class="alert alert-info" role="status">
            No WhatsApp messages have arrived for this location. Complete Meta webhook verification and channel activation first.
        </div>
    @else
        <p style="color:#667985">Latest 80 events. Customer numbers are masked; message content is visible only to staff with Settings permission.</p>
        @foreach($pmdWhatsAppMessages as $message)
            <article style="background:#fff;border:1px solid #dce6e4;border-radius:12px;margin:12px 0;padding:16px">
                <header style="display:flex;justify-content:space-between;gap:14px;flex-wrap:wrap">
                    <strong>{{ $message['direction'] === 'in' ? 'Customer' : 'Restaurant' }} · {{ $message['phone'] }}</strong>
                    <small style="color:#687a76">{{ $message['received_at'] }} · {{ $message['status'] }}</small>
                </header>
                <p style="white-space:pre-wrap;overflow-wrap:anywhere;margin:12px 0">{{ $message['body'] }}</p>
                @if(!empty($message['can_reply']))
                    <form data-request="onReply" data-request-success="window.location.reload()" method="post"
                          style="display:flex;align-items:flex-start;gap:8px;flex-wrap:wrap">
                        {{ csrf_field() }}
                        <input type="hidden" name="message_id" value="{{ (int)$message['id'] }}">
                        <textarea name="reply_text" maxlength="1600" rows="2"
                                  aria-label="Reply to customer" placeholder="Type a WhatsApp reply..."
                                  required style="flex:1;min-width:250px"></textarea>
                        <button type="submit" class="btn btn-primary">Send reply</button>
                    </form>
                @elseif($message['direction'] === 'in')
                    <small style="color:#836f45">24-hour reply window closed. An approved template is required to start a new conversation.</small>
                @endif
            </article>
        @endforeach
    @endif
    <p style="color:#667985;font-size:12px;margin-top:20px">This is a human-operated Inbox. The automated chatbot is not enabled. Customer messages are retained according to PayMyDine's WhatsApp retention policy.</p>
</div>
