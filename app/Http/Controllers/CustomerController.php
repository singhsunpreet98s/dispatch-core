<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreCustomerRequest;
use App\Http\Requests\UpdateCustomerRequest;
use App\Models\Customer;
use Inertia\Inertia;

class CustomerController extends Controller
{
    public function index()
    {
        return Inertia::render('customers/index', [
            'customers' => Inertia::defer(fn () => Customer::orderBy('created_at', 'desc')
                ->paginate(10, ['id', 'name', 'email', 'created_at'])),
        ]);
    }

    public function store(StoreCustomerRequest $request)
    {
        Customer::create($request->validated());

        return back()->with('success', 'Customer created.');
    }

    public function update(UpdateCustomerRequest $request, Customer $customer)
    {
        $customer->update($request->validated());

        return back()->with('success', 'Customer updated.');
    }

    public function destroy(Customer $customer)
    {
        $customer->delete();

        return back()->with('success', 'Customer deleted.');
    }
}
