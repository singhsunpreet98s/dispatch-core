<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreEmailTemplateRequest;
use App\Http\Requests\UpdateEmailTemplateRequest;
use App\Models\EmailTemplate;
use Inertia\Inertia;

class EmailTemplateController extends Controller
{
    public function index()
    {
        $user = auth()->user();

        $query = $user->isAdmin()
            ? EmailTemplate::with('user:id,name,email')->orderBy('created_at', 'desc')
            : EmailTemplate::where('user_id', $user->id)->orderBy('created_at', 'desc');

        return Inertia::render('templates/index', [
            'templates' => $query->paginate(15, ['id', 'user_id', 'title', 'subject', 'created_at', 'updated_at']),
            'isAdmin' => $user->isAdmin(),
        ]);
    }

    public function create()
    {
        return Inertia::render('templates/create');
    }

    public function store(StoreEmailTemplateRequest $request)
    {
        EmailTemplate::create([
            ...$request->validated(),
            'user_id' => auth()->id(),
        ]);

        return redirect()->route('templates.index')->with('success', 'Template created.');
    }

    public function edit(EmailTemplate $template)
    {
        $this->authorizeAccess($template);

        return Inertia::render('templates/edit', [
            'template' => $template,
        ]);
    }

    public function update(UpdateEmailTemplateRequest $request, EmailTemplate $template)
    {
        $this->authorizeAccess($template);
        $template->update($request->validated());

        return redirect()->route('templates.index')->with('success', 'Template updated.');
    }

    public function destroy(EmailTemplate $template)
    {
        $this->authorizeAccess($template);
        $template->delete();

        return back()->with('success', 'Template deleted.');
    }

    private function authorizeAccess(EmailTemplate $template): void
    {
        if (! auth()->user()->isAdmin() && $template->user_id !== auth()->id()) {
            abort(403);
        }
    }
}
