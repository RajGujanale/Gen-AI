import json
import csv
import datetime
from flask import Flask, render_template, request, jsonify, session as flask_session
from flask_session import Session

app = Flask(__name__)

# Configure server-side session for storing test results
app.config["SESSION_TYPE"] "filesystem"
app.config["SECRET_KEY"] = "test-system-secret-key"
Session(app)

# Functional requirements (from the report)
FUNCTIONAL_REQUIREMENTS = {
    "FR-01": "User Registration - The system shall allow new users to register using valid details such as name, email address, and password.",
    "FR-02": "User Login - The system shall authenticate registered users using valid credentials and reject invalid credentials.",
    "FR-03": "Product Search - The system shall allow users to search for products by name or keyword and display relevant results.",
    "FR-04": "Add to Cart - The system shall allow users to add available products to the shopping cart and update product quantities.",
    "FR-05": "Checkout - The system shall validate the delivery address and required checkout information before allowing an order to be placed.",
    "FR-06": "Order Placement - The system shall create an order when all required checkout conditions are satisfied and payment is successfully completed.",
    "FR-07": "Input Validation - The system shall reject invalid inputs, missing mandatory fields, and values outside the permitted limits."
}

# In-memory storage for test cases (reset on server restart)
test_results = {
    "total": 0,
    "passed": 0,
    "failed": 0,
    "blocked": 0,
    "not_executed": 0
}


def parse_requirements(req_text):
    """Parse entered requirements into structured format."""
    requirements = {}
    lines = [l.strip() for l in req_text.split('\n') if l.strip()]
    for line in lines:
        match = re.match(r'(FR-\d+):\s*(.+)', line)
        if match:
            req_id = match.group(1)
            req_desc = match.group(2)
            requirements[req_id] = req_desc
    return requirements


def classify_test_scenario(scenario_text):
    """Classify test as positive, negative, or boundary-value."""
    text = scenario_text.lower()
    if any(kw in text for kw in ['invalid', 'reject', 'error', 'missing', 'failed', 'above', 'below', 'maximum', 'minimum']):
        if any(kw in text for kw in ['boundary', 'minim', 'maxim', 'limit', 'permitted']):
            return 'boundary-value'
        return 'negative'
    return 'positive'


def generate_test_cases(requirements):
    """Generate structured test cases from requirements (rule-based demonstration)."""
    test_cases = []
    tc_id_counter = 1

    for req_id, req_desc in requirements.items():
        if 'registration' in req_desc.lower():
            # Registration with valid details
            test_cases.append({
                'id': f'TC-{tc_id_counter:03d}',
                'requirement_id': req_id,
                'scenario': 'Registration with valid details',
                'preconditions': 'User is on registration page with no existing account',
                'input_data': 'Name: "John Doe"; Email: "john.doe@example.com"; Password: "SecurePass123"',
                'test_steps': ['Navigate to registration page', 'Enter valid name, email, password', 'Click "Register" button'],
                'expected_result': 'User redirected to welcome page; account created with status "active"; confirmation email sent',
                'classification': 'positive',
                'traceability': req_id
            })
            tc_id_counter += 1

            # Registration with invalid email
            test_cases.append({
                'id': f'TC-{tc_id_counter:03d}',
                'requirement_id': req_id,
                'scenario': 'Registration with invalid email address',
                'preconditions': 'User is on registration page',
                'input_data': 'Name: "John Doe"; Email: "invalid-email"; Password: "SecurePass123"',
                'test_steps': ['Navigate to registration page', 'Enter valid name, invalid email, password', 'Click "Register" button'],
                'expected_result': 'Error message: "Please enter a valid email address"; user record NOT created',
                'classification': 'negative',
                'traceability': req_id
            })
            tc_id_counter += 1

            # Registration with missing mandatory fields
            test_cases.append({
                'id': f'TC-{tc_id_counter:03d}',
                'requirement_id': req_id,
                'scenario': 'Registration with missing mandatory fields',
                'preconditions': 'User is on registration page',
                'input_data': 'Name: "" (empty); Email: "john@example.com"; Password: "" (empty)',
                'test_steps': ['Navigate to registration page', 'Leave name empty, enter valid email, leave password empty', 'Click "Register" button'],
                'expected_result': 'Error messages for empty fields; form NOT submitted; user must correct all mandatory fields',
                'classification': 'negative',
                'traceability': req_id
            })
            tc_id_counter += 1

        elif 'login' in req_desc.lower():
            # Login with valid credentials
            test_cases.append({
                'id': f'TC-{tc_id_counter:03d}',
                'requirement_id': req_id,
                'scenario': 'Login with valid credentials',
                'preconditions': 'User has existing account',
                'input_data': 'Email: "john.doe@example.com"; Password: "SecurePass123"',
                'test_steps': ['Navigate to login page', 'Enter valid email and password', 'Click "Login" button'],
                'expected_result': 'User redirected to homepage; welcome message displayed; session established',
                'classification': 'positive',
                'traceability': req_id
            })
            tc_id_counter += 1

            # Login with incorrect password
            test_cases.append({
                'id': f'TC-{tc_id_counter:03d}',
                'requirement_id': req_id,
                'scenario': 'Login with incorrect password',
                'preconditions': 'User has existing account',
                'input_data': 'Email: "john.doe@example.com"; Password: "WrongPassword"',
                'test_steps': ['Navigate to login page', 'Enter valid email and incorrect password', 'Click "Login" button'],
                'expected_result': 'Error message: "Invalid credentials"; user remains on login page; account NOT locked (first failure)',
                'classification': 'negative',
                'traceability': req_id
            })
            tc_id_counter += 1

            # Account lockout after 5 failed attempts
            test_cases.append({
                'id': f'TC-{tc_id_counter:03d}',
                'requirement_id': req_id,
                'scenario': 'Account lockout after 5 failed login attempts',
                'preconditions': 'User has existing account',
                'input_data': 'Valid email; 5+ attempts with incorrect passwords',
                'test_steps': ['Navigate to login page', 'Enter valid email and incorrect password 5 times', 'On 6th attempt, enter incorrect password'],
                'expected_result': 'After 5 failures: "Account locked. Try again in 30 minutes."; 6th attempt blocks login',
                'classification': 'negative',
                'traceability': req_id
            })
            tc_id_counter += 1

        elif 'product search' in req_desc.lower():
            # Search for existing product
            test_cases.append({
                'id': f'TC-{tc_id_counter:03d}',
                'requirement_id': req_id,
                'scenario': 'Searching for an existing product',
                'preconditions': 'User is on product catalog page',
                'input_data': 'Search keyword: "wireless headphones"',
                'test_steps': ['Enter search keyword in field', 'Press Enter or click search icon', 'Observe results'],
                'expected_result': 'Product list displays items matching search term; pagination if >20 results',
                'classification': 'positive',
                'traceability': req_id
            })
            tc_id_counter += 1

            # Search for non-existent product
            test_cases.append({
                'id': f'TC-{tc_id_counter:03d}',
                'requirement_id': req_id,
                'scenario': 'Searching for a product that does not exist',
                'preconditions': 'User is on product catalog page',
                'input_data': 'Search keyword: "xyzabc123non existent product"',
                'test_steps': ['Enter search keyword in field', 'Press Enter or click search icon', 'Observe results'],
                'expected_result': 'No products found message: "We could not find any products matching your search."',
                'classification': 'negative',
                'traceability': req_id
            })
            tc_id_counter += 1

        elif 'add to cart' in req_desc.lower() or 'cart' in req_desc.lower():
            # Add available product to cart
            test_cases.append({
                'id': f'TC-{tc_id_counter:03d}',
                'requirement_id': req_id,
                'scenario': 'Adding an available product to the cart',
                'preconditions': 'User is logged in; product page displays item with available stock',
                'input_data': 'Product: "Blue T-Shirt" (price $29.99, stock 50); Quantity: 1',
                'test_steps': ['Navigate to product page', 'Select quantity 1', 'Click "Add to Cart" button', 'Observe cart update'],
                'expected_result': 'Product added confirmation; cart icon updates to show 1 item; cart subtotal $29.99',
                'classification': 'positive',
                'traceability': req_id
            })
            tc_id_counter += 1

            # Add unavailable product to cart
            test_cases.append({
                'id': f'TC-{tc_id_counter:03d}',
                'requirement_id': req_id,
                'scenario': 'Attempting to add an unavailable product to the cart',
                'preconditions': 'User is logged in; product page displays item with zero stock',
                'input_data': 'Product: "Limited Edition Watch"; stock 0; Quantity: 1',
                'test_steps': ['Navigate to product page', 'Select quantity 1', 'Click "Add to Cart" button', 'Observe response'],
                'expected_result': 'Error: "Sorry, this item is currently out of stock"; product NOT added to cart; cart unchanged',
                'classification': 'negative',
                'traceability': req_id
            })
            tc_id_counter += 1

            # Quantity at minimum
            test_cases.append({
                'id': f'TC-{tc_id_counter:03d}',
                'requirement_id': req_id,
                'scenario': 'Entering quantity at permitted minimum',
                'preconditions': 'Product added to cart; cart page displayed',
                'input_data': 'Product: "Cotton Sheets" (max 4 per customer); Quantity: 1',
                'test_steps': ['Add product to cart', 'Modify quantity field to 1', 'Observe cart updates'],
                'expected_result': 'Quantity set to 1 (minimum permitted); cart updates without error',
                'classification': 'boundary-value',
                'traceability': req_id
            })
            tc_id_counter += 1

            # Quantity above available stock/maximum
            test_cases.append({
                'id': f'TC-{tc_id_counter:03d}',
                'requirement_id': req_id,
                'scenario': 'Entering quantity above available stock or permitted maximum',
                'preconditions': 'Product added to cart; cart page displayed',
                'input_data': 'Product: "Premium Coffee Mugs" (stock 8, limit 3 per customer); Quantity: 5',
                'test_steps': ['Add product to cart', 'Modify quantity to 5', 'Observe cart updates and error messages'],
                'expected_result': 'Error: "Maximum 3 items per customer"; quantity automatically reduced to 3; error displayed prominently',
                'classification': 'boundary-value',
                'traceability': req_id
            })
            tc_id_counter += 1

        elif 'checkout' in req_desc.lower():
            # Complete checkout with valid details
            test_cases.append({
                'id': f'TC-{tc_id_counter:03d}',
                'requirement_id': req_id,
                'scenario': 'Completing checkout with valid details',
                'preconditions': 'User has items in cart; valid shipping/billing information',
                'input_data': 'Shipping: Name "John Doe", Address "123 Main St", City "Springfield", State "CA", Postal "90210", Country "USA"',
                'test_steps': ['Add items to cart', 'Click "Checkout"', 'Enter valid shipping/billing info', 'Click "Place Order"'],
                'expected_result': 'Order confirmation page; order number generated; confirmation email sent; inventory decremented; cart emptied',
                'classification': 'positive',
                'traceability': req_id
            })
            tc_id_counter += 1

            # Checkout with missing delivery address
            test_cases.append({
                'id': f'TC-{tc_id_counter:03d}',
                'requirement_id': req_id,
                'scenario': 'Attempting checkout with missing delivery address',
                'preconditions': 'User has items in cart; incomplete shipping information',
                'input_data': 'Shipping Name: "" (empty); Address Line 1: "456 Oak Ave"; City: "" (empty); State: "" (empty); Postal Code: "" (empty)',
                'test_steps': ['Start checkout', 'Leave required fields empty', 'Click "Place Order"'],
                'expected_result': 'Validation error prevents submission; error messages for empty required fields; "Place Order" button remains disabled',
                'classification': 'negative',
                'traceability': req_id
            })
            tc_id_counter += 1

            # Payment failure
            test_cases.append({
                'id': f'TC-{tc_id_counter:03d}',
                'requirement_id': req_id,
                'scenario': 'Attempting to place order when payment fails',
                'preconditions': 'Valid cart and checkout info; payment gateway declines or unavailable',
                'input_data': 'Cart: 1 item; Payment: Declined/Simulated failure',
                'test_steps': ['Complete checkout form', 'Submit payment (simulated decline)', 'Click "Place Order"'],
                'expected_result': 'Payment failure error displays; order NOT created; user returned to payment screen; cart preserved for retry',
                'classification': 'negative',
                'traceability': req_id
            })
            tc_id_counter += 1

        elif 'input validation' in req_desc.lower():
            # Reject invalid email format
            test_cases.append({
                'id': f'TC-{tc_id_counter:03d}',
                'requirement_id': req_id,
                'scenario': 'Reject invalid email format during registration',
                'preconditions': 'User is on registration page',
                'input_data': 'Email: "johnexample.com" (missing "@" symbol)',
                'test_steps': ['Navigate to registration page', 'Enter valid name, invalid email (no "@"), password', 'Click "Register"'],
                'expected_result': 'Error: "Please enter a valid email address"; form NOT submitted; user record NOT created',
                'classification': 'negative',
                'traceability': req_id
            })
            tc_id_counter += 1

            # Reject password below minimum length
            test_cases.append({
                'id': f'TC-{tc_id_counter:03d}',
                'requirement_id': req_id,
                'scenario': 'Reject password below minimum length',
                'preconditions': 'User is on registration page',
                'input_data': 'Password: "short" (5 characters)',
                'test_steps': ['Navigate to registration page', 'Enter valid name, valid email, short password', 'Click "Register"'],
                'expected_result': 'Error: "Password must be at least 8 characters"; form NOT submitted; focus moves to password field',
                'classification': 'negative',
                'traceability': req_id
            })
            tc_id_counter += 1

    return test_cases


@app.route('/')
def index():
    """Render the main page with the test case generator."""
    # Get stored test results or defaults
    results = flask_session.get('test_results', test_results)
    generated_cases = flask_session.get('generated_cases', [])
    return render_template('index.html',
                           requirements=FUNCTIONAL_REQUIREMENTS,
                           test_cases=generated_cases,
                           results=results,
                           zip=zip)


@app.route('/generate', methods=['POST'])
def generate_tests():
    """Handle test case generation request."""
    data = request.get_json()
    req_text = data.get('requirements', '')

    if not req_text.strip():
        return jsonify({'error': 'No requirements provided'}), 400

    # Parse requirements
    requirements = parse_requirements(req_text)

    if not requirements:
        return jsonify({'error': 'No valid requirements found (expected format: FR-01: description)'}), 400

    # Generate test cases
    test_cases = generate_test_cases(requirements)

    # Store results in session
    flask_session['generated_cases'] = test_cases
    flask_session['test_results'] = {
        'total': len(test_cases),
        'passed': 0,
        'failed': 0,
        'blocked': 0,
        'not_executed': len(test_cases)
    }

    return jsonify({
        'requirements_count': len(requirements),
        'test_cases_generated': len(test_cases),
        'test_cases': test_cases
    })


@app.route('/update-status', methods=['POST'])
def update_status():
    """Handle test status update from actual execution."""
    data = request.get_json()
    tc_id = data.get('test_case_id')
    status = data.get('status')  # Pass, Fail, Blocked, Not Executed
    actual_result = data.get('actual_result', '')

    if not tc_id or status not in ['Pass', 'Fail', 'Blocked', 'Not Executed']:
        return jsonify({'error': 'Invalid test case ID or status'}), 400

    # Update test results in session
    results = flask_session.get('test_results', test_results)
    cases = flask_session.get('generated_cases', [])

    # Find the test case and update
    for case in cases:
        if case['id'] == tc_id:
            case['actual_result'] = actual_result
            case['test_status'] = status

            # Update summary
            if status == 'Pass':
                results['passed'] += 1
                if case.get('old_status') == 'Fail':
                    results['failed'] -= 1
            elif status == 'Fail':
                results['failed'] += 1
                if case.get('old_status') == 'Pass':
                    results['passed'] -= 1
            elif status == 'Blocked':
                results['blocked'] += 1
            elif status == 'Not Executed':
                results['not_executed'] += 1

            case['old_status'] = status
            break

    flask_session['test_results'] = results
    flask_session['generated_cases'] = cases

    # Recalculate totals
    results['total'] = results['passed'] + results['failed'] + results['blocked'] + results['not_executed']

    return jsonify({
        'success': True,
        'results': results,
        'test_cases': cases
    })


@app.route('/export/csv', methods=['GET'])
def export_csv():
    """Export test cases and results as CSV."""
    cases = flask_session.get('generated_cases', [])
    results = flask_session.get('test_results', test_results)

    if not cases:
        return jsonify({'error': 'No test cases to export'}), 400

    fieldnames = ['Test Case ID', 'Requirement ID', 'Test Scenario',
                  'Preconditions', 'Input Data', 'Test Steps',
                  'Expected Result', 'Actual Result', 'Test Status',
                  'Defect ID or Remarks']

    output = []
    writer = csv.DictWriter(output, fieldnames=fieldnames)
    writer.writeheader()

    for case in cases:
        writer.writerow({
            'Test Case ID': case.get('id', ''),
            'Requirement ID': case.get('requirement_id', ''),
            'Test Scenario': case.get('scenario', ''),
            'Preconditions': case.get('preconditions', ''),
            'Input Data': case.get('input_data', ''),
            'Test Steps': '; '.join(case.get('test_steps', [])),
            'Expected Result': case.get('expected_result', ''),
            'Actual Result': case.get('actual_result', ''),
            'Test Status': case.get('test_status', 'Not Executed'),
            'Defect ID or Remarks': case.get('defect_id', '')
        })

    return jsonify({
        'success': True,
        'csv_data': ''.join(output),
        'filename': f'test_cases_{datetime.datetime.now().strftime("%Y%m%d_%H%M%S")}.csv'
    })


@app.route '/export/json', methods=['GET']
def export_json():
    """Export test cases and results as JSON."""
    cases = flask_session.get('generated_cases', [])
    results = flask_session.get('test_results', test_results)

    export_data = {
        'generated_at': datetime.datetime.now().isoformat(),
        'requirements_analyzed': len(set(c.get('requirement_id') for c in cases)),
        'test_cases': cases,
        'summary': results
    }

    return jsonify({
        'success': True,
        'json_data': json.dumps(export_data, indent=2),
        'filename': f'test_report_{datetime.datetime.now().strftime("%Y%m%d_%H%M%S")}.json'
    })


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)