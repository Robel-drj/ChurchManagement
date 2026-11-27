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

  static const List<int> _quickAmounts = [50, 100, 500, 1000];

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

  double get _confirmedTotal {
    var total = 0.0;
    for (final item in _contributions) {
      final status = _statusText(item).toLowerCase();
      if (status == 'confirmed' || status == 'succeeded') {
        final numeric = double.tryParse((item['amount'] ?? 0).toString());
        if (numeric != null && numeric.isFinite) {
          total += numeric;
        }
      }
    }
    return total;
  }

  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
      color: AppColors.primary,
      onRefresh: _loadPayments,
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(18, 16, 18, 32),
        children: [
          _GivingWalletBanner(
            confirmedTotal: _confirmedTotal,
            transactionCount: _contributions.length,
            isLoading: _loading,
          ),
          const SizedBox(height: 20),
          if (_loading)
            const _PaymentLoadingState()
          else ...[
            if (_error != null) ...[
              Container(
                padding: const EdgeInsets.all(14),
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
                      size: 20,
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        'Could not load payment information: $_error',
                        style: const TextStyle(
                          color: AppColors.error,
                          fontSize: 12.5,
                          height: 1.4,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
            ],
            _buildCheckoutCard(),
            const SizedBox(height: 26),
            _buildHistoryHeader(),
            const SizedBox(height: 12),
            if (_contributions.isEmpty)
              _buildEmptyHistory()
            else
              ..._contributions.map(_buildContributionCard),
          ],
        ],
      ),
    );
  }

  Widget _buildCheckoutCard() {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: AppColors.border.withValues(alpha: 0.9)),
        boxShadow: const [
          BoxShadow(
            color: Color(0x0B101828),
            blurRadius: 24,
            offset: Offset(0, 10),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Top Checkout Strip
          Padding(
            padding: const EdgeInsets.fromLTRB(18, 18, 18, 14),
            child: Row(
              children: [
                Container(
                  width: 42,
                  height: 42,
                  decoration: BoxDecoration(
                    color: AppColors.primary.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(13),
                  ),
                  child: const Icon(
                    Icons.volunteer_activism_rounded,
                    color: AppColors.primary,
                    size: 22,
                  ),
                ),
                const SizedBox(width: 12),
                const Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Send Contribution',
                        style: TextStyle(
                          color: AppColors.textPrimary,
                          fontSize: 16.5,
                          fontWeight: FontWeight.w800,
                          letterSpacing: -0.2,
                        ),
                      ),
                      SizedBox(height: 2),
                      Text(
                        'Instant online transfer via Chapa',
                        style: TextStyle(
                          color: AppColors.textSecondary,
                          fontSize: 12,
                        ),
                      ),
                    ],
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 10,
                    vertical: 5,
                  ),
                  decoration: BoxDecoration(
                    color: const Color(0xFFECFDF5),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: const Color(0xFFA7F3D0)),
                  ),
                  child: const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        Icons.shield_rounded,
                        size: 13,
                        color: Color(0xFF059669),
                      ),
                      SizedBox(width: 4),
                      Text(
                        'CHAPA',
                        style: TextStyle(
                          color: Color(0xFF059669),
                          fontSize: 10,
                          fontWeight: FontWeight.w800,
                          letterSpacing: 0.6,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),

          Divider(height: 1, color: AppColors.border.withValues(alpha: 0.7)),

          Padding(
            padding: const EdgeInsets.all(18),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // 1. Category Pill Selector
                const Text(
                  'SELECT PURPOSE',
                  style: TextStyle(
                    color: AppColors.textSecondary,
                    fontSize: 10.5,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 0.8,
                  ),
                ),
                const SizedBox(height: 10),
                if (_categories.isEmpty)
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: AppColors.surfaceMuted,
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: const Text(
                      'No contribution categories available right now.',
                      style: TextStyle(
                        color: AppColors.textSecondary,
                        fontSize: 13,
                      ),
                    ),
                  )
                else
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: _categories.map((category) {
                      final id = category['id']?.toString();
                      final name = (category['name'] ??
                              category['category_name'] ??
                              'Category')
                          .toString();
                      final isSelected = id != null && id == _selectedCategoryId;

                      return ChoiceChip(
                        label: Text(name),
                        selected: isSelected,
                        showCheckmark: false,
                        onSelected: _submitting || id == null
                            ? null
                            : (_) {
                                setState(() {
                                  _selectedCategoryId = id;
                                });
                              },
                        avatar: Icon(
                          isSelected
                              ? Icons.check_circle_rounded
                              : Icons.circle_outlined,
                          size: 16,
                          color: isSelected
                              ? Colors.white
                              : AppColors.textSecondary,
                        ),
                        labelStyle: TextStyle(
                          color: isSelected
                              ? Colors.white
                              : AppColors.textPrimary,
                          fontSize: 13,
                          fontWeight: FontWeight.w700,
                        ),
                        selectedColor: AppColors.primary,
                        backgroundColor: AppColors.surfaceMuted,
                        side: BorderSide(
                          color: isSelected
                              ? AppColors.primary
                              : AppColors.border,
                        ),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                        padding: const EdgeInsets.symmetric(
                          horizontal: 10,
                          vertical: 8,
                        ),
                      );
                    }).toList(),
                  ),

                const SizedBox(height: 20),

                // 2. Hero Amount Box
                const Text(
                  'AMOUNT TO GIVE',
                  style: TextStyle(
                    color: AppColors.textSecondary,
                    fontSize: 10.5,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 0.8,
                  ),
                ),
                const SizedBox(height: 10),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 14,
                  ),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF8FAFC),
                    borderRadius: BorderRadius.circular(18),
                    border: Border.all(
                      color: AppColors.primary.withValues(alpha: 0.28),
                      width: 1.5,
                    ),
                  ),
                  child: Column(
                    children: [
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.center,
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 10,
                              vertical: 6,
                            ),
                            decoration: BoxDecoration(
                              color: AppColors.primary.withValues(alpha: 0.1),
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: const Text(
                              'ETB',
                              style: TextStyle(
                                color: AppColors.primary,
                                fontSize: 14,
                                fontWeight: FontWeight.w900,
                                letterSpacing: 0.5,
                              ),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: TextField(
                              controller: _amountController,
                              enabled: !_submitting,
                              keyboardType:
                                  const TextInputType.numberWithOptions(
                                decimal: true,
                              ),
                              style: const TextStyle(
                                color: AppColors.textPrimary,
                                fontSize: 28,
                                fontWeight: FontWeight.w900,
                                letterSpacing: -0.5,
                              ),
                              decoration: const InputDecoration(
                                hintText: '0.00',
                                hintStyle: TextStyle(
                                  color: Color(0xFFCBD5E1),
                                  fontSize: 28,
                                  fontWeight: FontWeight.w800,
                                ),
                                border: InputBorder.none,
                                enabledBorder: InputBorder.none,
                                focusedBorder: InputBorder.none,
                                isDense: true,
                                contentPadding: EdgeInsets.zero,
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      // Quick Amount Preset Chips
                      Row(
                        children: _quickAmounts.map((preset) {
                          return Expanded(
                            child: Padding(
                              padding: EdgeInsets.only(
                                right: preset == _quickAmounts.last ? 0 : 6,
                              ),
                              child: InkWell(
                                borderRadius: BorderRadius.circular(10),
                                onTap: _submitting
                                    ? null
                                    : () {
                                        setState(() {
                                          _amountController.text =
                                              preset.toString();
                                        });
                                      },
                                child: Container(
                                  padding: const EdgeInsets.symmetric(
                                    vertical: 7,
                                  ),
                                  decoration: BoxDecoration(
                                    color: AppColors.surface,
                                    borderRadius: BorderRadius.circular(10),
                                    border: Border.all(color: AppColors.border),
                                  ),
                                  alignment: Alignment.center,
                                  child: Text(
                                    '+$preset',
                                    style: const TextStyle(
                                      color: AppColors.textPrimary,
                                      fontSize: 12,
                                      fontWeight: FontWeight.w700,
                                    ),
                                  ),
                                ),
                              ),
                            ),
                          );
                        }).toList(),
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: 16),

                // 3. Optional Note Field
                TextField(
                  controller: _notesController,
                  enabled: !_submitting,
                  maxLines: 2,
                  minLines: 1,
                  style: const TextStyle(fontSize: 14),
                  decoration: InputDecoration(
                    hintText: 'Add a prayer request or note (optional)',
                    hintStyle: const TextStyle(
                      color: AppColors.textSecondary,
                      fontSize: 13,
                    ),
                    prefixIcon: const Icon(
                      Icons.edit_note_rounded,
                      color: AppColors.textSecondary,
                    ),
                    filled: true,
                    fillColor: AppColors.surfaceMuted.withValues(alpha: 0.6),
                    contentPadding: const EdgeInsets.symmetric(
                      horizontal: 14,
                      vertical: 12,
                    ),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(14),
                      borderSide: BorderSide(color: AppColors.border),
                    ),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(14),
                      borderSide: BorderSide(color: AppColors.border),
                    ),
                  ),
                ),

                const SizedBox(height: 18),

                // 4. Primary Checkout CTA Button
                SizedBox(
                  width: double.infinity,
                  height: 52,
                  child: FilledButton(
                    style: FilledButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(16),
                      ),
                      elevation: 0,
                    ),
                    onPressed: _submitting || _categories.isEmpty
                        ? null
                        : _startPayment,
                    child: _submitting
                        ? const Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              SizedBox(
                                width: 18,
                                height: 18,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2.2,
                                  color: Colors.white,
                                ),
                              ),
                              SizedBox(width: 10),
                              Text(
                                'Connecting to Chapa...',
                                style: TextStyle(
                                  fontSize: 15,
                                  fontWeight: FontWeight.w800,
                                ),
                              ),
                            ],
                          )
                        : const Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(Icons.lock_rounded, size: 18),
                              SizedBox(width: 8),
                              Text(
                                'Pay Securely with Chapa',
                                style: TextStyle(
                                  fontSize: 15,
                                  fontWeight: FontWeight.w800,
                                  letterSpacing: -0.1,
                                ),
                              ),
                              SizedBox(width: 6),
                              Icon(Icons.arrow_forward_rounded, size: 18),
                            ],
                          ),
                  ),
                ),

                const SizedBox(height: 12),

                // Security Footer
                const Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(
                      Icons.verified_user_rounded,
                      size: 14,
                      color: AppColors.success,
                    ),
                    SizedBox(width: 6),
                    Flexible(
                      child: Text(
                        '256-bit encrypted checkout • Telebirr, CBE Birr & Cards supported',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          fontSize: 11,
                          color: AppColors.textSecondary,
                          fontWeight: FontWeight.w500,
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

  Widget _buildHistoryHeader() {
    return Row(
      children: [
        const Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Transaction History',
                style: TextStyle(
                  color: AppColors.textPrimary,
                  fontSize: 17,
                  fontWeight: FontWeight.w800,
                  letterSpacing: -0.2,
                ),
              ),
              SizedBox(height: 2),
              Text(
                'Tap refresh on any receipt to sync status',
                style: TextStyle(
                  color: AppColors.textSecondary,
                  fontSize: 12,
                ),
              ),
            ],
          ),
        ),
        TextButton.icon(
          onPressed: _loadPayments,
          style: TextButton.styleFrom(
            foregroundColor: AppColors.primary,
            backgroundColor: AppColors.primary.withValues(alpha: 0.08),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
            ),
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          ),
          icon: const Icon(Icons.refresh_rounded, size: 17),
          label: const Text(
            'Sync all',
            style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700),
          ),
        ),
      ],
    );
  }

  Widget _buildEmptyHistory() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 34),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        children: [
          Container(
            width: 54,
            height: 54,
            decoration: BoxDecoration(
              color: AppColors.primary.withValues(alpha: 0.08),
              shape: BoxShape.circle,
            ),
            child: const Icon(
              Icons.receipt_long_rounded,
              size: 26,
              color: AppColors.primary,
            ),
          ),
          const SizedBox(height: 12),
          const Text(
            'No contributions yet',
            style: TextStyle(
              color: AppColors.textPrimary,
              fontSize: 15,
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 4),
          const Text(
            'Your digital receipts and payment history will appear here once you give.',
            textAlign: TextAlign.center,
            style: TextStyle(
              color: AppColors.textSecondary,
              fontSize: 12.5,
              height: 1.4,
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

    final isConfirmed =
        status.toLowerCase() == 'confirmed' ||
        status.toLowerCase() == 'succeeded';
    final isFailed =
        status.toLowerCase() == 'rejected' ||
        status.toLowerCase() == 'failed' ||
        status.toLowerCase() == 'cancelled';

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(15),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: AppColors.border.withValues(alpha: 0.85)),
        boxShadow: const [
          BoxShadow(
            color: Color(0x05101828),
            blurRadius: 12,
            offset: Offset(0, 4),
          ),
        ],
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          // Status Icon Badge
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(13),
            ),
            child: Icon(
              isConfirmed
                  ? Icons.check_circle_rounded
                  : isFailed
                      ? Icons.cancel_rounded
                      : Icons.schedule_rounded,
              color: color,
              size: 22,
            ),
          ),
          const SizedBox(width: 12),
          // Category, Date & Status Pill
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  category.toString(),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    color: AppColors.textPrimary,
                    fontSize: 14.5,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 4),
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 7,
                        vertical: 2.5,
                      ),
                      decoration: BoxDecoration(
                        color: color.withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        status,
                        style: TextStyle(
                          color: color,
                          fontWeight: FontWeight.w800,
                          fontSize: 9.5,
                          letterSpacing: 0.4,
                        ),
                      ),
                    ),
                    if (date != null) ...[
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          _formatContributionDate(date.toString()),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            color: AppColors.textSecondary,
                            fontSize: 11.5,
                          ),
                        ),
                      ),
                    ],
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          // Right Amount & Refresh Button
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                _formatAmount(amount),
                style: const TextStyle(
                  color: AppColors.textPrimary,
                  fontSize: 15,
                  fontWeight: FontWeight.w900,
                  letterSpacing: -0.3,
                ),
              ),
              const SizedBox(height: 4),
              InkWell(
                borderRadius: BorderRadius.circular(8),
                onTap: () => _refreshContribution(item),
                child: Padding(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 6,
                    vertical: 3,
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(
                        Icons.sync_rounded,
                        size: 13,
                        color: AppColors.primary,
                      ),
                      const SizedBox(width: 3),
                      const Text(
                        'Verify',
                        style: TextStyle(
                          color: AppColors.primary,
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ],
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

// ============================================================================
// FINTECH GIVING WALLET BANNER
// ============================================================================

class _GivingWalletBanner extends StatelessWidget {
  final double confirmedTotal;
  final int transactionCount;
  final bool isLoading;

  const _GivingWalletBanner({
    required this.confirmedTotal,
    required this.transactionCount,
    required this.isLoading,
  });

  @override
  Widget build(BuildContext context) {
    final formattedTotal = NumberFormat('#,##0.00').format(confirmedTotal);

    return Container(
      padding: const EdgeInsets.all(22),
      decoration: BoxDecoration(
        gradient: AppColors.primaryGradient,
        borderRadius: BorderRadius.circular(26),
        boxShadow: const [
          BoxShadow(
            color: Color(0x2E4F46E5),
            blurRadius: 24,
            offset: Offset(0, 10),
          ),
        ],
      ),
      child: Stack(
        children: [
          Positioned(
            right: -28,
            top: -32,
            child: Container(
              width: 118,
              height: 118,
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.09),
                shape: BoxShape.circle,
              ),
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 10,
                      vertical: 5,
                    ),
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.16),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          Icons.favorite_rounded,
                          color: Colors.white,
                          size: 13,
                        ),
                        SizedBox(width: 5),
                        Text(
                          'CHURCH GIVING',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 10,
                            fontWeight: FontWeight.w800,
                            letterSpacing: 0.8,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const Spacer(),
                  const Icon(
                    Icons.credit_score_rounded,
                    color: Colors.white70,
                    size: 22,
                  ),
                ],
              ),
              const SizedBox(height: 18),
              const Text(
                'Total Confirmed Giving',
                style: TextStyle(
                  color: Color(0xD9FFFFFF),
                  fontSize: 12.5,
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(height: 4),
              Row(
                crossAxisAlignment: CrossAxisAlignment.baseline,
                textBaseline: TextBaseline.alphabetic,
                children: [
                  const Text(
                    'ETB ',
                    style: TextStyle(
                      color: Color(0xD9FFFFFF),
                      fontSize: 16,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  Text(
                    isLoading ? '—' : formattedTotal,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 28,
                      fontWeight: FontWeight.w900,
                      letterSpacing: -0.6,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 14),
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 12,
                  vertical: 8,
                ),
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(
                      Icons.receipt_outlined,
                      color: Colors.white,
                      size: 15,
                    ),
                    const SizedBox(width: 6),
                    Text(
                      isLoading
                          ? 'Syncing records...'
                          : '$transactionCount ${transactionCount == 1 ? 'contribution' : 'contributions'} recorded',
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _PaymentLoadingState extends StatelessWidget {
  const _PaymentLoadingState();

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 240,
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: AppColors.border),
      ),
      child: const Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            CircularProgressIndicator(color: AppColors.primary),
            SizedBox(height: 14),
            Text(
              'Loading payment options...',
              style: TextStyle(
                color: AppColors.textSecondary,
                fontSize: 13,
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ),
      ),
    );
  }
}