<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Break Reminder</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
    .preheader { display: none; max-height: 0; overflow: hidden; font-size: 1px; color: #f1f5f9; }
  </style>
</head>
<body>
  <div class="preheader">Reminder #{{ $reminderNumber }}: Your break has been open {{ $durationMinutes }} min — please end it now.</div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9; padding: 32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px; background:#ffffff; border-radius:10px; overflow:hidden; border:1px solid #e2e8f0;">

        {{-- Top stripe --}}
        <tr><td style="background:#f59e0b; height:3px; font-size:0;">&nbsp;</td></tr>

        {{-- Header --}}
        <tr>
          <td style="padding:20px 24px 16px; border-bottom:1px solid #f1f5f9;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td valign="middle">
                  @if($logoUrl)
                    <img src="{{ $logoUrl }}" alt="{{ $companyName }}" style="max-height:36px; max-width:140px; object-fit:contain; display:block;">
                  @else
                    <p style="font-size:15px; font-weight:700; color:#0f172a; margin:0;">{{ $companyName }}</p>
                  @endif
                </td>
                <td align="right" valign="middle">
                  <span style="display:inline-block; background:#fef3c7; color:#b45309; font-size:12px; font-weight:700; padding:3px 10px; border-radius:20px; border:1px solid #fde68a;">
                    Reminder #{{ $reminderNumber }}
                  </span>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        {{-- Body --}}
        <tr>
          <td style="padding:20px 24px;">
            <p style="font-size:14px; color:#475569; line-height:1.6; margin:0 0 16px;">
              Hi <strong style="color:#0f172a;">{{ $employee->name }}</strong>, your break started at <strong style="color:#0f172a;">{{ $break->started_at->format('g:i A') }}</strong> and has been open for <strong style="color:#d97706;">{{ $durationMinutes }} minutes</strong>. Please end your break now.
            </p>

            {{-- Divider --}}
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 16px;">
              <tr><td style="border-top:1px solid #f1f5f9; font-size:0;">&nbsp;</td></tr>
            </table>

            <p style="font-size:12px; color:#94a3b8; margin:0;">
              This is automated reminder {{ $reminderNumber }}. Reminders stop once your break is closed or your shift ends.
            </p>
          </td>
        </tr>

        {{-- Footer --}}
        <tr>
          <td style="padding:12px 24px; background:#f8fafc; border-top:1px solid #f1f5f9;">
            <p style="font-size:11px; color:#cbd5e1; margin:0;">&copy; {{ date('Y') }} {{ $companyName }} &middot; support@unishipcargo.com</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>
