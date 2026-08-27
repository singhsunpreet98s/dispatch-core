<?php

namespace App\Http\Controllers;

use App\Models\MonthlySalary;
use App\Models\Salary;
use App\Models\SalaryHistory;
use App\Models\SystemSetting;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response as HttpResponse;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class SalaryController extends Controller
{
    public function myRemuneration(Request $request): Response
    {
        $user = $request->user();

        abort_if($user->role === 'admin', 403, 'This page is not available for admins.');

        $salary = $user->salary;

        $history = SalaryHistory::where('user_id', $user->id)
            ->with('changedBy:id,name')
            ->orderByDesc('created_at')
            ->get();

        $monthlyPay = MonthlySalary::where('user_id', $user->id)
            ->orderByDesc('year')
            ->orderByDesc('month')
            ->get();

        return Inertia::render('remuneration', [
            'salary'      => $salary,
            'history'     => $history,
            'monthly_pay' => $monthlyPay,
        ]);
    }

    public function show(User $user): Response
    {
        abort_if($user->role === 'admin', 403, 'Salary cannot be set for admins.');

        $salary = $user->salary;

        $history = SalaryHistory::where('user_id', $user->id)
            ->with('changedBy:id,name')
            ->orderByDesc('created_at')
            ->get();

        $monthlyPay = MonthlySalary::where('user_id', $user->id)
            ->orderByDesc('year')
            ->orderByDesc('month')
            ->get();

        $totalPaid = $monthlyPay->sum(fn ($m) => (float) $m->gross_earned);

        return Inertia::render('users/salary', [
            'user'        => $user->only('id', 'name', 'email', 'role'),
            'salary'      => $salary,
            'history'     => $history,
            'monthly_pay' => $monthlyPay,
            'total_paid'  => round($totalPaid, 2),
        ]);
    }

    public function slip(User $user, MonthlySalary $monthlySalary): HttpResponse
    {
        abort_if($monthlySalary->user_id !== $user->id, 404);

        return response()->view('salary-slip', $this->slipData($user, $monthlySalary));
    }

    public function mySlip(Request $request, MonthlySalary $monthlySalary): HttpResponse
    {
        $user = $request->user();
        abort_if($monthlySalary->user_id !== $user->id, 403);

        return response()->view('salary-slip', $this->slipData($user, $monthlySalary));
    }

    private function slipData(User $user, MonthlySalary $record): array
    {
        $monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'];

        $logoPath = SystemSetting::get('logo_path');

        return [
            'user'      => $user,
            'record'    => $record,
            'monthName' => $monthNames[$record->month - 1],
            'logoUrl'   => $logoPath ? Storage::disk('public')->url($logoPath) : null,
            'company'   => [
                'name'    => SystemSetting::get('company_name', ''),
                'gst'     => SystemSetting::get('company_gst', ''),
                'address' => SystemSetting::get('company_address', ''),
                'phone'   => SystemSetting::get('company_phone', ''),
            ],
        ];
    }

    public function update(User $user, Request $request): RedirectResponse
    {
        abort_if($user->role === 'admin', 403, 'Salary cannot be set for admins.');

        $validated = $request->validate([
            'changed_field' => ['required', 'in:ctc,per_month'],
            'change_type' => ['required', 'in:percentage,amount,absolute'],
            'direction' => ['required_unless:change_type,absolute', 'nullable', 'in:increase,decrease'],
            'change_value' => ['required', 'numeric', 'min:0'],
        ]);

        $salary = $user->salary;
        $oldCtc = $salary ? (float) $salary->ctc : 0.0;
        $oldPerMonth = $salary ? (float) $salary->per_month : 0.0;

        $field = $validated['changed_field'];
        $type = $validated['change_type'];
        $direction = $validated['direction'] ?? null;
        $value = (float) $validated['change_value'];

        [$newCtc, $newPerMonth] = $this->computeNewValues($field, $type, $direction, $value, $oldCtc, $oldPerMonth);

        Salary::updateOrCreate(
            ['user_id' => $user->id],
            ['ctc' => $newCtc, 'per_month' => $newPerMonth]
        );

        SalaryHistory::create([
            'user_id' => $user->id,
            'changed_by' => $request->user()->id,
            'changed_field' => $field,
            'change_type' => $type,
            'direction' => $direction,
            'change_value' => $value,
            'old_ctc' => $oldCtc,
            'new_ctc' => $newCtc,
            'old_per_month' => $oldPerMonth,
            'new_per_month' => $newPerMonth,
        ]);

        return redirect()->route('users.salary.show', $user)->with('success', 'Salary updated successfully.');
    }

    private function computeNewValues(
        string $field,
        string $type,
        ?string $direction,
        float $value,
        float $oldCtc,
        float $oldPerMonth
    ): array {
        if ($field === 'ctc') {
            $newCtc = match ($type) {
                'percentage' => $direction === 'increase'
                    ? $oldCtc + ($oldCtc * $value / 100)
                    : $oldCtc - ($oldCtc * $value / 100),
                'amount' => $direction === 'increase'
                    ? $oldCtc + $value
                    : $oldCtc - $value,
                'absolute' => $value,
            };
            $newCtc = max(0, round($newCtc, 2));
            $newPerMonth = round($newCtc / 12, 2);
        } else {
            $newPerMonth = match ($type) {
                'percentage' => $direction === 'increase'
                    ? $oldPerMonth + ($oldPerMonth * $value / 100)
                    : $oldPerMonth - ($oldPerMonth * $value / 100),
                'amount' => $direction === 'increase'
                    ? $oldPerMonth + $value
                    : $oldPerMonth - $value,
                'absolute' => $value,
            };
            $newPerMonth = max(0, round($newPerMonth, 2));
            $newCtc = round($newPerMonth * 12, 2);
        }

        return [$newCtc, $newPerMonth];
    }
}
