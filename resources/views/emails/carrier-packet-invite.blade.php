<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Carrier Packet Invitation</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #f4f6f9;
      color: #1a1a2e;
      line-height: 1.6;
    }
    .wrapper {
      max-width: 600px;
      margin: 40px auto;
      background: #ffffff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 12px rgba(0,0,0,0.08);
    }
    .header {
      background-color: #1a1a2e;
      padding: 28px 40px;
      text-align: center;
    }
    .header img {
      max-height: 60px;
      max-width: 220px;
      object-fit: contain;
    }
    .header .company-name {
      color: #ffffff;
      font-size: 20px;
      font-weight: 600;
      letter-spacing: 0.5px;
    }
    .body {
      padding: 40px;
    }
    .greeting {
      font-size: 22px;
      font-weight: 600;
      color: #1a1a2e;
      margin-bottom: 16px;
    }
    .body p {
      font-size: 15px;
      color: #4a4a6a;
      margin-bottom: 16px;
    }
    .info-box {
      background: #f8f9fc;
      border-left: 4px solid #4f46e5;
      border-radius: 4px;
      padding: 16px 20px;
      margin: 24px 0;
    }
    .info-box p {
      margin-bottom: 6px;
      font-size: 14px;
    }
    .info-box p:last-child { margin-bottom: 0; }
    .info-box strong { color: #1a1a2e; }
    .cta-wrapper {
      text-align: center;
      margin: 32px 0;
    }
    .cta-button {
      display: inline-block;
      background-color: #4f46e5;
      color: #ffffff !important;
      text-decoration: none;
      font-size: 16px;
      font-weight: 600;
      padding: 14px 36px;
      border-radius: 6px;
      letter-spacing: 0.3px;
    }
    .link-fallback {
      font-size: 13px;
      color: #888;
      text-align: center;
      word-break: break-all;
    }
    .link-fallback a {
      color: #4f46e5;
    }
    .divider {
      border: none;
      border-top: 1px solid #eeeef5;
      margin: 32px 0;
    }
    .footer {
      background-color: #f8f9fc;
      padding: 24px 40px;
      text-align: center;
      font-size: 12px;
      color: #9999bb;
    }
    .footer a { color: #4f46e5; text-decoration: none; }
  </style>
</head>
<body>
  <div class="wrapper">

    {{-- Header with logo or company name --}}
    <div class="header">
      @if($logoUrl)
        <img src="{{ $logoUrl }}" alt="{{ $companyName }}">
      @else
        <div class="company-name">{{ $companyName }}</div>
      @endif
    </div>

    {{-- Body --}}
    <div class="body">
      <p class="greeting">You've been invited to complete a Carrier Packet</p>

      <p>Hello,</p>

      <p>
        {{ $companyName }} has created a carrier packet for <strong>{{ $packetCompanyName }}</strong>
        and requires your information to proceed.
        Please click the button below to open the form and complete your details.
      </p>

      <div class="info-box">
        <p><strong>Company:</strong> {{ $packetCompanyName }}</p>
        <p><strong>USDOT Number:</strong> {{ $mcNumber }}</p>
        <p><strong>Sent by:</strong> {{ $senderName }}</p>
      </div>

      <div class="cta-wrapper">
        <a href="{{ $packetUrl }}" class="cta-button">Complete Carrier Packet</a>
      </div>

      <p class="link-fallback">
        If the button doesn't work, copy and paste this link into your browser:<br>
        <a href="{{ $packetUrl }}">{{ $packetUrl }}</a>
      </p>

      <hr class="divider">

      <p style="font-size:13px; color:#9999bb;">
        This link is unique to your carrier packet. Do not share it with others.
        If you believe you received this email by mistake, you can safely ignore it.
      </p>
    </div>

    {{-- Footer --}}
    <div class="footer">
      <p>&copy; {{ date('Y') }} {{ $companyName }}. All rights reserved.</p>
      @if($companyAddress)
        <p style="margin-top:6px;">{{ $companyAddress }}</p>
      @endif
      @if($companyPhone)
        <p style="margin-top:4px;">{{ $companyPhone }}</p>
      @endif
    </div>

  </div>
</body>
</html>
