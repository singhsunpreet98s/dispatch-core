<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Salary Slip – {{ $monthName }} {{ $record->year }}</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }

        body {
            font-family: 'Segoe UI', Arial, sans-serif;
            font-size: 13px;
            color: #1a1a1a;
            background: #f4f4f4;
        }

        .page {
            width: 794px;
            min-height: 1123px;
            margin: 24px auto;
            background: #fff;
            padding: 40px 48px;
            border: 1px solid #e0e0e0;
        }

        /* ── Header ── */
        .header {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            padding-bottom: 20px;
            border-bottom: 2px solid #1a1a1a;
            gap: 16px;
        }

        .header-logo img {
            max-height: 64px;
            max-width: 180px;
            object-fit: contain;
        }

        .header-logo .logo-placeholder {
            font-size: 22px;
            font-weight: 700;
            color: #1a1a1a;
        }

        .header-company {
            text-align: right;
            flex: 1;
        }

        .header-company .company-name {
            font-size: 18px;
            font-weight: 700;
            color: #1a1a1a;
            margin-bottom: 4px;
        }

        .header-company .company-detail {
            font-size: 11px;
            color: #555;
            line-height: 1.6;
        }

        /* ── Slip title bar ── */
        .slip-title-bar {
            margin-top: 20px;
            background: #1a1a1a;
            color: #fff;
            text-align: center;
            padding: 8px 16px;
            letter-spacing: 2px;
            font-size: 13px;
            font-weight: 600;
            text-transform: uppercase;
        }

        /* ── Info row ── */
        .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 0;
            border: 1px solid #d0d0d0;
            border-top: none;
        }

        .info-cell {
            padding: 8px 14px;
            border-bottom: 1px solid #e8e8e8;
            display: flex;
            gap: 8px;
        }

        .info-cell:nth-child(odd) {
            border-right: 1px solid #d0d0d0;
        }

        .info-label {
            color: #666;
            font-size: 11px;
            min-width: 110px;
            flex-shrink: 0;
        }

        .info-value {
            font-weight: 600;
            font-size: 12px;
        }

        /* ── Section heading ── */
        .section-heading {
            margin-top: 24px;
            margin-bottom: 0;
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 1px;
            color: #555;
            padding: 6px 14px;
            background: #f7f7f7;
            border: 1px solid #d0d0d0;
        }

        /* ── Earnings / Deductions table ── */
        .slip-table {
            width: 100%;
            border-collapse: collapse;
            border: 1px solid #d0d0d0;
            border-top: none;
        }

        .slip-table th {
            background: #f0f0f0;
            font-size: 11px;
            font-weight: 600;
            padding: 7px 14px;
            text-align: left;
            border-bottom: 1px solid #d0d0d0;
        }

        .slip-table th.right { text-align: right; }

        .slip-table td {
            padding: 7px 14px;
            font-size: 12px;
            border-bottom: 1px solid #ececec;
        }

        .slip-table td.right { text-align: right; }

        .slip-table tr:last-child td { border-bottom: none; }

        /* ── Net pay ── */
        .net-pay-bar {
            margin-top: 24px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: #1a1a1a;
            color: #fff;
            padding: 12px 20px;
            border-radius: 4px;
        }

        .net-pay-label {
            font-size: 14px;
            font-weight: 600;
            letter-spacing: 1px;
            text-transform: uppercase;
        }

        .net-pay-amount {
            font-size: 22px;
            font-weight: 700;
        }

        /* ── Footer ── */
        .footer {
            margin-top: 32px;
            display: flex;
            justify-content: space-between;
            font-size: 11px;
            color: #888;
            border-top: 1px solid #e0e0e0;
            padding-top: 16px;
        }

        .signature-block {
            text-align: center;
            margin-top: 40px;
        }

        .signature-line {
            width: 180px;
            border-top: 1px solid #555;
            margin: 0 auto 4px;
        }

        .signature-label {
            font-size: 11px;
            color: #555;
        }

        /* ── Print ── */
        @media print {
            body { background: #fff; }
            .page { margin: 0; border: none; padding: 28px 36px; width: 100%; min-height: auto; }
            .no-print { display: none !important; }
        }
    </style>
</head>
<body onload="window.print()">

<div class="page">

    {{-- Header: Logo left, company right --}}
    <div class="header">
        <div class="header-logo">
            @if($logoUrl)
                <img src="{{ $logoUrl }}" alt="{{ $company['name'] }}">
            @else
                <span class="logo-placeholder">{{ $company['name'] ?: config('app.name') }}</span>
            @endif
        </div>
        <div class="header-company">
            @if($company['name'])
                <div class="company-name">{{ $company['name'] }}</div>
            @endif
            <div class="company-detail">
                @if($company['address']){{ $company['address'] }}<br>@endif
                @if($company['gst'])<strong>GSTIN:</strong> {{ $company['gst'] }}<br>@endif
                @if($company['phone'])<strong>Ph:</strong> {{ $company['phone'] }}@endif
            </div>
        </div>
    </div>

    {{-- Title bar --}}
    <div class="slip-title-bar">Salary Slip — {{ $monthName }} {{ $record->year }}</div>

    {{-- Employee info --}}
    <div class="info-grid">
        <div class="info-cell">
            <span class="info-label">Employee Name</span>
            <span class="info-value">{{ $user->name }}</span>
        </div>
        <div class="info-cell">
            <span class="info-label">Pay Period</span>
            <span class="info-value">{{ $monthName }} {{ $record->year }}</span>
        </div>
        <div class="info-cell">
            <span class="info-label">Email</span>
            <span class="info-value">{{ $user->email }}</span>
        </div>
        <div class="info-cell">
            <span class="info-label">Working Days</span>
            <span class="info-value">{{ $record->total_days }}</span>
        </div>
        <div class="info-cell">
            <span class="info-label">Designation</span>
            <span class="info-value">{{ ucfirst($user->role) }}</span>
        </div>
        <div class="info-cell">
            <span class="info-label">Generated On</span>
            <span class="info-value">{{ now()->format('d M Y') }}</span>
        </div>
    </div>

    {{-- Salary Summary --}}
    <div class="section-heading">Salary Summary</div>
    <table class="slip-table">
        <thead>
            <tr>
                <th>Description</th>
                <th class="right">Amount (₹)</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td>
                    Monthly Salary
                    <span style="color:#666;font-size:11px;margin-left:8px">
                        ({{ $record->days_present }} of {{ $record->total_days }} working days)
                    </span>
                </td>
                <td class="right">{{ number_format((float)$record->gross_earned, 2) }}</td>
            </tr>
        </tbody>
    </table>

    {{-- Net pay --}}
    <div class="net-pay-bar">
        <span class="net-pay-label">Net Pay</span>
        <span class="net-pay-amount">₹ {{ number_format((float)$record->gross_earned, 2) }}</span>
    </div>

    {{-- Signature --}}
    <div style="margin-top:40px; display:flex; justify-content:flex-end;">
        <div class="signature-block">
            <div class="signature-line"></div>
            <div class="signature-label">Authorised Signatory</div>
        </div>
    </div>

    {{-- Footer --}}
    <div class="footer">
        <span>This is a system-generated salary slip and does not require a physical signature.</span>
        <span>{{ $company['name'] ?: config('app.name') }}</span>
    </div>

</div>

</body>
</html>
