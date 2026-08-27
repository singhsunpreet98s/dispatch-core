<?php

namespace App\Http\Controllers;

use App\Models\Salary;
use App\Models\SalaryHistory;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
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

        return Inertia::render('remuneration', [
            'salary' => $salary,
            'history' => $history,
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

        return Inertia::render('users/salary', [
            'user' => $user->only('id', 'name', 'email', 'role'),
            'salary' => $salary,
            'history' => $history,
        ]);
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
