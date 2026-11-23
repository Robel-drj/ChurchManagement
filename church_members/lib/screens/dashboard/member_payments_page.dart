import 'dart:math';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/theme/app_colors.dart';
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

      var opened = await launchUrl(
        uri,
        mode: kIsWeb
            ? LaunchMode.platformDefault
            : LaunchMode.externalApplication,
        webOnlyWindowName: kIsWeb ? '_self' : null,
      );

      if (!opened && !kIsWeb) {
        opened = await launchUrl(uri, mode: LaunchMode.inAppBrowserView);
      }

      if (!opened) {
        throw Exception('Could not open Chapa checkout.');
      }

      _pendingIdempotencyKey = null;

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
        return AppColors.success;
      case 'rejected':
      case 'failed':
      case 'cancelled':
        return AppColors.error;
      case 'pending':
      case 'initiating':
        return AppColors.warning;
      default:
        return AppColors.textSecondary;
    }
  }

  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
      onRefresh: _loadPayments,
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(20, 16, 20, 30),
        children: [
          const _GivingPageHeader(),
          const SizedBox(height: 22),
          if (_loading)
            const _PaymentLoadingState()
          else ...[
            if (_error != null) ...[
              Container(
                padding: const EdgeInsets.all(15),
                decoration: BoxDecoration(
                  color: const Color(0xFFFEF2F2),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: const Color(0xFFFECACA)),
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Icon(
                      Icons.error_outline_rounded,
                      color: AppColors.error,
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        'Could not load payment information: $_error',
                        style: const TextStyle(
                          color: AppColors.error,
                          fontSize: 12,
                          height: 1.4,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 14),
            ],
            _buildPaymentForm(),
            const SizedBox(height: 26),
            Row(
              children: [
                Container(
                  width: 42,
                  height: 42,
                  decoration: BoxDecoration(
                    color: const Color(0xFFCCFBF1),
                    borderRadius: BorderRadius.circular(13),
                  ),
                  child: const Icon(
                    Icons.receipt_long_outlined,
                    color: AppColors.secondary,
                    size: 21,
                  ),
                ),
                const SizedBox(width: 11),
                const Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'My contributions',
                        style: TextStyle(
                          fontSize: 17,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      SizedBox(height: 2),
                      Text(
                        'Your recent giving and payment status',
                        style: TextStyle(
                          color: AppColors.textSecondary,
                          fontSize: 11,
                        ),
                      ),
                    ],
                  ),
                ),
                IconButton.filledTonal(
                  onPressed: _loadPayments,
                  icon: const Icon(Icons.refresh_rounded),
                  tooltip: 'Refresh history',
                ),
              ],
            ),
            const SizedBox(height: 12),
            if (_contributions.isEmpty)
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 22,
                  vertical: 28,
                ),
                decoration: BoxDecoration(
                  color: AppColors.surface,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: AppColors.border),
                ),
                child: const Column(
                  children: [
                    Icon(
                      Icons.volunteer_activism_outlined,
                      size: 34,
                      color: AppColors.textSecondary,
                    ),
                    SizedBox(height: 10),
                    Text(
                      'No contributions yet',
                      style: TextStyle(fontWeight: FontWeight.w800),
                    ),
                    SizedBox(height: 4),
                    Text(
                      'Your giving history will appear here.',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        color: AppColors.textSecondary,
                        fontSize: 12,
                      ),
                    ),
                  ],
                ),
              )
            else
              ..._contributions.map(_buildContributionCard),
          ],
        ],
      ),
    );
  }

  Widget _buildPaymentForm() {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: AppColors.border),
        boxShadow: const [
          BoxShadow(
            color: Color(0x0F101828),
            blurRadius: 20,
            offset: Offset(0, 8),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(18),
            decoration: const BoxDecoration(
              color: Color(0xFFF0FDFA),
              borderRadius: BorderRadius.vertical(top: Radius.circular(21)),
              border: Border(bottom: BorderSide(color: Color(0xFFCCFBF1))),
            ),
            child: const Row(
              children: [
                _GivingIcon(),
                SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Make a contribution',
                        style: TextStyle(
                          fontSize: 17,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      SizedBox(height: 3),
                      Text(
                        'Give securely through Chapa',
                        style: TextStyle(
                          color: AppColors.textSecondary,
                          fontSize: 12,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(18),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                DropdownButtonFormField<String>(
                  initialValue: _selectedCategoryId,
                  isExpanded: true,
                  decoration: const InputDecoration(
                    labelText: 'Contribution category',
                    prefixIcon: Icon(Icons.category_outlined),
                  ),
                  items: _categories.map((category) {
                    return DropdownMenuItem<String>(
                      value: category['id']?.toString(),
                      child: Text(
                        (category['name'] ??
                                category['category_name'] ??
                                'Category')
                            .toString(),
                        overflow: TextOverflow.ellipsis,
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
                    prefixIcon: Icon(Icons.payments_outlined),
                    prefixText: 'ETB ',
                  ),
                ),
                const SizedBox(height: 14),
                TextField(
                  controller: _notesController,
                  maxLines: 2,
                  decoration: const InputDecoration(
                    labelText: 'Notes (optional)',
                    prefixIcon: Icon(Icons.notes_rounded),
                    alignLabelWithHint: true,
                  ),
                ),
                const SizedBox(height: 18),
                SizedBox(
                  width: double.infinity,
                  child: FilledButton.icon(
                    onPressed: _submitting || _categories.isEmpty
                        ? null
                        : _startPayment,
                    icon: _submitting
                        ? const SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: Colors.white,
                            ),
                          )
                        : const Icon(Icons.lock_rounded, size: 19),
                    label: Text(
                      _submitting
                          ? 'Starting payment...'
                          : 'Continue to secure payment',
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                const Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(
                      Icons.verified_user_outlined,
                      size: 15,
                      color: AppColors.success,
                    ),
                    SizedBox(width: 6),
                    Flexible(
                      child: Text(
                        'You will complete your payment securely with Chapa.',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          fontSize: 11,
                          color: AppColors.textSecondary,
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
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
      child: Padding(
        padding: const EdgeInsets.all(15),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: 46,
              height: 46,
              decoration: BoxDecoration(
                color: color.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(14),
              ),
              child: Icon(
                Icons.volunteer_activism_outlined,
                color: color,
                size: 23,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(
                        child: Text(
                          category.toString(),
                          style: const TextStyle(
                            color: AppColors.textPrimary,
                            fontSize: 14,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 8,
                          vertical: 4,
                        ),
                        decoration: BoxDecoration(
                          color: color.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Text(
                          status,
                          style: TextStyle(
                            color: color,
                            fontWeight: FontWeight.w800,
                            fontSize: 9,
                            letterSpacing: 0.4,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 7),
                  Text(
                    _formatAmount(amount),
                    style: const TextStyle(
                      color: AppColors.textPrimary,
                      fontSize: 18,
                      fontWeight: FontWeight.w800,
                      letterSpacing: -0.3,
                    ),
                  ),
                  if (date != null) ...[
                    const SizedBox(height: 5),
                    Row(
                      children: [
                        const Icon(
                          Icons.schedule_rounded,
                          size: 14,
                          color: AppColors.textSecondary,
                        ),
                        const SizedBox(width: 4),
                        Expanded(
                          child: Text(
                            _formatContributionDate(date.toString()),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              color: AppColors.textSecondary,
                              fontSize: 11,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ],
              ),
            ),
            IconButton(
              tooltip: 'Refresh payment status',
              icon: const Icon(Icons.refresh_rounded),
              color: AppColors.primary,
              style: IconButton.styleFrom(
                backgroundColor: const Color(0xFFE0E7FF),
              ),
              onPressed: () => _refreshContribution(item),
            ),
          ],
        ),
      ),
    );
  }

  String _formatAmount(dynamic amount) {
    final numeric = double.tryParse(amount.toString());
    if (numeric == null) return 'ETB $amount';
    return 'ETB ${NumberFormat('#,##0.00').format(numeric)}';
  }

  String _formatContributionDate(String value) {
    final parsed = DateTime.tryParse(value);
    if (parsed == null) return value;
    return DateFormat('MMM d, y • h:mm a').format(parsed.toLocal());
  }
}

class _GivingPageHeader extends StatelessWidget {
  const _GivingPageHeader();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(22),
      decoration: BoxDecoration(
        gradient: AppColors.calmGradient,
        borderRadius: BorderRadius.circular(26),
        boxShadow: const [
          BoxShadow(
            color: Color(0x300F766E),
            blurRadius: 24,
            offset: Offset(0, 10),
          ),
        ],
      ),
      child: const Row(
        children: [
          _GivingHeaderIcon(),
          SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'GIVE WITH PURPOSE',
                  style: TextStyle(
                    color: Color(0xD9FFFFFF),
                    fontSize: 10,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 1,
                  ),
                ),
                SizedBox(height: 5),
                Text(
                  'My Giving',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 24,
                    fontWeight: FontWeight.w800,
                    letterSpacing: -0.4,
                  ),
                ),
                SizedBox(height: 5),
                Text(
                  'Support your church simply and securely.',
                  style: TextStyle(
                    color: Color(0xE6FFFFFF),
                    fontSize: 12,
                    height: 1.4,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _GivingHeaderIcon extends StatelessWidget {
  const _GivingHeaderIcon();

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 58,
      height: 58,
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.16),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: Colors.white24),
      ),
      child: const Icon(
        Icons.volunteer_activism_rounded,
        color: Colors.white,
        size: 31,
      ),
    );
  }
}

class _GivingIcon extends StatelessWidget {
  const _GivingIcon();

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 44,
      height: 44,
      decoration: BoxDecoration(
        color: const Color(0xFFCCFBF1),
        borderRadius: BorderRadius.circular(14),
      ),
      child: const Icon(
        Icons.favorite_outline_rounded,
        color: AppColors.secondary,
        size: 23,
      ),
    );
  }
}

class _PaymentLoadingState extends StatelessWidget {
  const _PaymentLoadingState();

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 220,
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: AppColors.border),
      ),
      child: const Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            CircularProgressIndicator(),
            SizedBox(height: 14),
            Text(
              'Loading your giving information...',
              style: TextStyle(color: AppColors.textSecondary, fontSize: 12),
            ),
          ],
        ),
      ),
    );
  }
}
