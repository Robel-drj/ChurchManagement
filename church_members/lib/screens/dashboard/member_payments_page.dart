import 'dart:math';

import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../services/payment_service.dart';

class MemberPaymentsPage extends StatefulWidget {
  final String churchId;
  final PaymentService paymentService;

  const MemberPaymentsPage({
    super.key,
    required this.churchId,
    required this.paymentService,
  });

  @override
  State<MemberPaymentsPage> createState() => _MemberPaymentsPageState();
}

class _MemberPaymentsPageState extends State<MemberPaymentsPage> {
  final _amountController = TextEditingController();
  final _notesController = TextEditingController();

  List<Map<String, dynamic>> _categories = [];
  List<Map<String, dynamic>> _contributions = [];

  String? _selectedCategoryId;
  String? _pendingIdempotencyKey;
  bool _loading = true;
  bool _submitting = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadPayments();
  }

  @override
  void dispose() {
    _amountController.dispose();
    _notesController.dispose();
    super.dispose();
  }

  Future<void> _loadPayments() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final results = await Future.wait([
        widget.paymentService.getContributionCategories(widget.churchId),
        widget.paymentService.getMyContributions(widget.churchId),
      ]);

      if (!mounted) return;

      final categories = results[0];

      setState(() {
        _categories = categories;
        _contributions = results[1];

        if (_selectedCategoryId == null ||
            !_categories.any(
              (item) => item['id']?.toString() == _selectedCategoryId,
            )) {
          _selectedCategoryId = _categories.isEmpty
              ? null
              : _categories.first['id']?.toString();
        }

        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;

      setState(() {
        _loading = false;
        _error = e.toString();
      });
    }
  }

  String _newIdempotencyKey() {
    final random = Random.secure();

    final bytes = List<int>.generate(16, (_) => random.nextInt(256));

    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;

    final hex = bytes
        .map((value) => value.toRadixString(16).padLeft(2, '0'))
        .join();

    return '${hex.substring(0, 8)}-'
        '${hex.substring(8, 12)}-'
        '${hex.substring(12, 16)}-'
        '${hex.substring(16, 20)}-'
        '${hex.substring(20)}';
  }

  String? _findString(Map<String, dynamic> data, List<String> keys) {
    for (final key in keys) {
      final value = data[key];

      if (value is String && value.trim().isNotEmpty) {
        return value;
      }
    }

    for (final key in ['data', 'payment', 'contribution', 'result']) {
      final nested = data[key];

      if (nested is Map) {
        final result = _findString(Map<String, dynamic>.from(nested), keys);

        if (result != null) return result;
      }
    }

    return null;
  }

  Future<void> _startPayment() async {
    FocusScope.of(context).unfocus();

    final amount = double.tryParse(_amountController.text.trim());

    if (_selectedCategoryId == null) {
      _showMessage('Please select a contribution category.');
      return;
    }

    if (amount == null || !amount.isFinite || amount < 1) {
      _showMessage('Enter a valid amount of at least ETB 1.');
      return;
    }

    if ((amount * 100).round() <= 0) {
      _showMessage('Please enter a valid payment amount.');
      return;
    }

    setState(() => _submitting = true);

    try {
      final response = await widget.paymentService.createOnlineContribution(
        churchId: widget.churchId,
        categoryId: _selectedCategoryId!,
        amount: amount,
        idempotencyKey: _pendingIdempotencyKey ??= _newIdempotencyKey(),
        notes: _notesController.text,
      );

      final checkoutUrl = _findString(response, [
        'checkout_url',
        'checkoutUrl',
      ]);

      if (checkoutUrl == null) {
        throw Exception('The server did not return a checkout URL.');
      }

      final uri = Uri.tryParse(checkoutUrl);

      if (uri == null || uri.scheme != 'https' || uri.host.isEmpty) {
        throw Exception('The checkout URL is invalid.');
      }

      final opened = await launchUrl(uri, mode: LaunchMode.externalApplication);
      _pendingIdempotencyKey = null;
      if (!opened) {
        throw Exception('Could not open Chapa checkout.');
      }

      _amountController.clear();
      _notesController.clear();

      if (!mounted) return;

      _showMessage(
        'Chapa checkout opened. Complete the payment, then refresh your history.',
      );

      await _loadPayments();
    } catch (e) {
      if (mounted) {
        _showMessage('Payment could not be started: $e');
      }
    } finally {
      if (mounted) {
        setState(() => _submitting = false);
      }
    }
  }

  Future<void> _refreshContribution(Map<String, dynamic> contribution) async {
    final contributionId =
        (contribution['contribution_id'] ?? contribution['id'])?.toString();

    if (contributionId == null || contributionId.isEmpty) {
      _showMessage('Contribution ID was not found.');
      return;
    }

    try {
      final result = await widget.paymentService.getMyContributionStatus(
        churchId: widget.churchId,
        contributionId: contributionId,
      );

      final status = _findString(result, ['payment_status', 'status']);

      await _loadPayments();

      if (!mounted) return;

      _showMessage(
        status == null
            ? 'Payment status refreshed.'
            : 'Payment status: $status',
      );
    } catch (e) {
      if (mounted) {
        _showMessage('Could not refresh payment status: $e');
      }
    }
  }

  void _showMessage(String message) {
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(SnackBar(content: Text(message)));
  }

  String _statusText(Map<String, dynamic> item) {
    final status =
        item['payment_status'] ?? item['status'] ?? item['attempt_status'];

    return (status ?? 'unknown').toString().replaceAll('_', ' ').toUpperCase();
  }

  Color _statusColor(String status) {
    switch (status.toLowerCase()) {
      case 'confirmed':
      case 'succeeded':
        return Colors.green;
      case 'rejected':
      case 'failed':
      case 'cancelled':
        return Colors.red;
      case 'pending':
      case 'initiating':
        return Colors.orange;
      default:
        return Colors.grey;
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Center(child: CircularProgressIndicator());
    }

    return RefreshIndicator(
      onRefresh: _loadPayments,
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        children: [
          if (_error != null)
            Card(
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Text('Could not load payment information: $_error'),
              ),
            ),

          _buildPaymentForm(),

          const SizedBox(height: 24),

          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'My contributions',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
              ),
              IconButton(
                onPressed: _loadPayments,
                icon: const Icon(Icons.refresh),
                tooltip: 'Refresh history',
              ),
            ],
          ),

          if (_contributions.isEmpty)
            const Padding(
              padding: EdgeInsets.all(20),
              child: Center(child: Text('No contributions yet.')),
            )
          else
            ..._contributions.map(_buildContributionCard),
        ],
      ),
    );
  }

  Widget _buildPaymentForm() {
    return Card(
      elevation: 1,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Make a contribution',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),

            const SizedBox(height: 16),

            DropdownButtonFormField<String>(
              initialValue: _selectedCategoryId,
              decoration: const InputDecoration(
                labelText: 'Contribution category',
                border: OutlineInputBorder(),
              ),
              items: _categories.map((category) {
                return DropdownMenuItem<String>(
                  value: category['id']?.toString(),
                  child: Text(
                    (category['name'] ??
                            category['category_name'] ??
                            'Category')
                        .toString(),
                  ),
                );
              }).toList(),
              onChanged: _submitting
                  ? null
                  : (value) {
                      setState(() {
                        _selectedCategoryId = value;
                      });
                    },
            ),

            const SizedBox(height: 14),

            TextField(
              controller: _amountController,
              keyboardType: const TextInputType.numberWithOptions(
                decimal: true,
              ),
              decoration: const InputDecoration(
                labelText: 'Amount',
                prefixText: 'ETB ',
                border: OutlineInputBorder(),
              ),
            ),

            const SizedBox(height: 14),

            TextField(
              controller: _notesController,
              maxLines: 2,
              decoration: const InputDecoration(
                labelText: 'Notes (optional)',
                border: OutlineInputBorder(),
              ),
            ),

            const SizedBox(height: 16),

            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: _submitting || _categories.isEmpty
                    ? null
                    : _startPayment,
                icon: _submitting
                    ? const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Icon(Icons.payment),
                label: Text(
                  _submitting ? 'Starting payment...' : 'Pay online with Chapa',
                ),
              ),
            ),

            const SizedBox(height: 8),

            const Text(
              'You will be redirected to Chapa to complete your payment securely.',
              style: TextStyle(fontSize: 12, color: Colors.grey),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildContributionCard(Map<String, dynamic> item) {
    final status = _statusText(item);
    final color = _statusColor(status);

    final amount = item['amount'] ?? 0;
    final category =
        item['category_name'] ?? item['category'] ?? 'Contribution';

    final date = item['contribution_date'] ?? item['created_at'];

    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      child: ListTile(
        title: Text(category.toString()),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('ETB $amount'),
            if (date != null)
              Text(date.toString(), style: const TextStyle(fontSize: 12)),
            const SizedBox(height: 4),
            Text(
              status,
              style: TextStyle(
                color: color,
                fontWeight: FontWeight.bold,
                fontSize: 12,
              ),
            ),
          ],
        ),
        trailing: IconButton(
          tooltip: 'Refresh payment status',
          icon: const Icon(Icons.refresh),
          onPressed: () => _refreshContribution(item),
        ),
        isThreeLine: true,
      ),
    );
  }
}
