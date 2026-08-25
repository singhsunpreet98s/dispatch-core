<?php

namespace App\Http\Controllers;

use App\Models\Campaign;
use App\Models\EmailList;
use App\Models\EmailTemplate;
use App\Models\Schedule;
use App\Models\User;
use App\Services\SendGridService;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
use Inertia\Inertia;

class CampaignController extends Controller
{
    public function __construct(private SendGridService $sendGrid) {}

    public function index(Request $request)
    {
        $request->validate([
            'user_id' => ['nullable', 'integer', 'exists:users,id'],
            'type'    => ['nullable', 'string', 'in:manual,automation'],
        ]);

        $authUser       = auth()->user();
        $isAdmin        = $authUser->isAdmin();
        $selectedUserId = $isAdmin ? ($request->integer('user_id') ?: null) : null;
        $typeFilter     = $request->input('type'); // null = all

        // ── Manual campaigns ─────────────────────────────────────────────────
        $manualRows = collect();
        if (! $typeFilter || $typeFilter === 'manual') {
            $q = Campaign::with(['user:id,name,email', 'template:id,title', 'emailList:id,list_name,email_count']);
            if (! $isAdmin) {
                $q->where('user_id', $authUser->id);
            } elseif ($selectedUserId) {
                $q->where('user_id', $selectedUserId);
            }

            $manualRows = $q->get()->map(fn ($c) => [
                'id'             => 'manual-' . $c->id,
                'db_id'          => $c->id,
                'type'           => 'manual',
                'name'           => $c->name,
                'subject'        => $c->subject,
                'status'         => $c->status,            // sending|sent|failed
                'schedule_status'=> null,
                'template_title' => $c->template?->title,
                'list_name'      => $c->emailList?->list_name,
                'contact_count'  => $c->contact_count,
                'sent_at'        => $c->sent_at?->toIso8601String(),
                'created_at'     => $c->created_at->toIso8601String(),
                'user'           => $c->user ? ['name' => $c->user->name, 'email' => $c->user->email] : null,
                'error_message'  => $c->error_message,
                'sendgrid_id'    => $c->sendgrid_singlesend_id,
                'triggers'       => null,
            ]);
        }

        // ── Scheduled campaigns (automation) ──────────────────────────────────
        $autoRows = collect();
        if (! $typeFilter || $typeFilter === 'automation') {
            $q = Schedule::with(['user:id,name,email', 'template:id,title,subject', 'emailList:id,list_name,email_count', 'triggers']);
            if (! $isAdmin) {
                $q->where('user_id', $authUser->id);
            } elseif ($selectedUserId) {
                $q->where('user_id', $selectedUserId);
            }

            $autoRows = $q->get()->map(fn ($s) => [
                'id'             => 'automation-' . $s->id,
                'db_id'          => $s->id,
                'type'           => 'automation',
                'name'           => $s->name,
                'subject'        => $s->template?->subject ?? '—',
                'status'         => null,
                'schedule_status'=> $s->status,            // active|paused
                'template_title' => $s->template?->title,
                'list_name'      => $s->emailList?->list_name,
                'contact_count'  => $s->emailList?->email_count ?? 0,
                'sent_at'        => null,
                'created_at'     => $s->created_at->toIso8601String(),
                'user'           => $s->user ? ['name' => $s->user->name, 'email' => $s->user->email] : null,
                'error_message'  => null,
                'sendgrid_id'    => $s->sendgrid_singlesend_id,
                'triggers'       => $s->triggers->map(fn ($t) => [
                    'weekday' => $t->weekday,
                    'time'    => $t->time,
                ])->values(),
            ]);
        }

        // ── Merge, sort newest-first, paginate ────────────────────────────────
        $all     = $manualRows->concat($autoRows)->sortByDesc('created_at')->values();
        $perPage = 20;
        $page    = $request->integer('page', 1);
        $paginated = new LengthAwarePaginator(
            $all->slice(($page - 1) * $perPage, $perPage)->values(),
            $all->count(),
            $perPage,
            $page,
            ['path' => $request->url(), 'query' => $request->query()],
        );

        // ── Data for the send sheet ───────────────────────────────────────────
        $templates = EmailTemplate::when(! $isAdmin, fn ($q) => $q->where('user_id', $authUser->id))
            ->orderBy('title')
            ->get(['id', 'title', 'subject', 'body']);

        $emailLists = EmailList::when(! $isAdmin, fn ($q) => $q->where('user_id', $authUser->id))
            ->whereNotNull('sendgrid_list_id')
            ->orderBy('list_name')
            ->get(['id', 'list_name', 'email_count', 'sendgrid_list_id']);

        $users = $isAdmin
            ? User::orderBy('name')->get(['id', 'name', 'email'])
            : collect();

        return Inertia::render('campaigns/index', [
            'campaigns'  => Inertia::defer(fn () => $paginated),
            'templates'  => $templates,
            'emailLists' => $emailLists,
            'isAdmin'    => $isAdmin,
            'users'      => $users,
            'filters'    => [
                'user_id' => $selectedUserId,
                'type'    => $typeFilter,
            ],
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name'          => ['required', 'string', 'max:255'],
            'template_id'   => ['required', 'integer', 'exists:email_templates,id'],
            'email_list_id' => ['required', 'integer', 'exists:email_lists,id'],
        ]);

        $user     = auth()->user();
        $template = EmailTemplate::findOrFail($validated['template_id']);
        $list     = EmailList::findOrFail($validated['email_list_id']);

        if (! $user->sendgrid_contact_id) {
            return back()->with('error', 'Your account does not have a SendGrid Sender ID configured. Ask an admin to set your Sender ID in the Users page before sending campaigns.');
        }

        if (! $list->sendgrid_list_id) {
            return back()->with('error', 'The selected email list has not been synced to SendGrid. Please re-upload the list first.');
        }

        $campaign = Campaign::create([
            'user_id'       => $user->id,
            'template_id'   => $template->id,
            'email_list_id' => $list->id,
            'name'          => $validated['name'],
            'subject'       => $template->subject,
            'contact_count' => $list->email_count,
            'status'        => 'sending',
        ]);

        try {
            $singlesendId = $this->sendGrid->sendToList(
                $validated['name'],
                $template->subject,
                $template->body,
                $list->sendgrid_list_id,
                (int) $user->sendgrid_contact_id,
            );

            $campaign->update([
                'sendgrid_singlesend_id' => $singlesendId,
                'status'                 => 'sent',
                'sent_at'                => now(),
            ]);

            return back()->with('success', "Campaign \"{$validated['name']}\" sent to {$list->email_count} contact(s).");
        } catch (\RuntimeException $e) {
            $campaign->update([
                'status'        => 'failed',
                'error_message' => $e->getMessage(),
            ]);

            return back()->with('error', 'SendGrid error: ' . $e->getMessage());
        }
    }
}
