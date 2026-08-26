<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreScheduleRequest;
use App\Http\Requests\UpdateScheduleRequest;
use App\Models\EmailList;
use App\Models\EmailTemplate;
use App\Models\Schedule;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class ScheduleController extends Controller
{
    public function index()
    {
        $user = auth()->user();

        $query = $user->isAdmin()
            ? Schedule::with(['template:id,title', 'emailList:id,original_name,email_count', 'triggers', 'user:id,name,email'])
            : Schedule::where('user_id', $user->id)
                ->with(['template:id,title', 'emailList:id,original_name,email_count', 'triggers']);

        return Inertia::render('schedules/index', [
            'schedules'  => Inertia::defer(fn () => $query->orderBy('created_at', 'desc')->paginate(15)),
            'templates'  => $this->availableTemplates($user),
            'emailLists' => $this->availableEmailLists($user),
            'isAdmin'    => $user->isAdmin(),
        ]);
    }

    public function show(Schedule $schedule)
    {
        $this->authorizeAccess($schedule);

        $schedule->load(['template:id,title,subject', 'emailList:id,original_name,email_count', 'triggers', 'user:id,name,email']);

        return Inertia::render('schedules/show', [
            'schedule' => $schedule,
            'isAdmin' => auth()->user()->isAdmin(),
        ]);
    }

    public function store(StoreScheduleRequest $request)
    {
        if (! auth()->user()->sendgrid_contact_id) {
            return back()->with('error', 'Your SendGrid Sender ID is not configured. Ask an admin to set it up before creating schedules.');
        }

        $schedule = Schedule::create([
            'user_id' => auth()->id(),
            'name' => $request->validated('name'),
            'type' => $request->validated('type'),
            'template_id' => $request->validated('template_id'),
            'email_list_id' => $request->validated('email_list_id'),
        ]);

        $this->syncTriggers($schedule->id, $request->validated('triggers'));

        return redirect()->route('schedules.index')->with('success', 'Schedule created.');
    }

    public function update(UpdateScheduleRequest $request, Schedule $schedule)
    {
        $this->authorizeAccess($schedule);

        $schedule->update($request->safe()->except('triggers'));

        $schedule->triggers()->delete();
        $this->syncTriggers($schedule->id, $request->validated('triggers'));

        return redirect()->route('schedules.index')->with('success', 'Schedule updated.');
    }

    public function destroy(Schedule $schedule)
    {
        $this->authorizeAccess($schedule);
        $schedule->delete();

        return back()->with('success', 'Schedule deleted.');
    }

    private function syncTriggers(int $scheduleId, array $triggers): void
    {
        $now = now();

        DB::table('schedule_triggers')->insert(
            array_map(fn ($t) => [
                'schedule_id' => $scheduleId,
                'weekday' => isset($t['weekday']) && $t['weekday'] !== '' ? (int) $t['weekday'] : null,
                'time' => $t['time'],
                'created_at' => $now,
                'updated_at' => $now,
            ], $triggers)
        );
    }

    private function authorizeAccess(Schedule $schedule): void
    {
        if (! auth()->user()->isAdmin() && $schedule->user_id !== auth()->id()) {
            abort(403);
        }
    }

    private function availableTemplates($user)
    {
        return $user->isAdmin()
            ? EmailTemplate::select('id', 'title', 'subject')->orderBy('title')->get()
            : EmailTemplate::where('user_id', $user->id)->select('id', 'title', 'subject')->orderBy('title')->get();
    }

    private function availableEmailLists($user)
    {
        return $user->isAdmin()
            ? EmailList::select('id', 'original_name', 'email_count')->orderBy('original_name')->get()
            : EmailList::where('user_id', $user->id)->select('id', 'original_name', 'email_count')->orderBy('original_name')->get();
    }
}
