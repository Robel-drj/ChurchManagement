import 'dart:convert';

import 'package:flutter/material.dart';

import '../../core/network/api_exceptions.dart';
import '../../core/theme/app_colors.dart';
import '../../services/auth_service.dart';

class ChangePasswordScreen extends StatefulWidget {
  const ChangePasswordScreen({super.key, required this.authService});

  final AuthService authService;

  @override
  State<ChangePasswordScreen> createState() => _ChangePasswordScreenState();
}

class _ChangePasswordScreenState extends State<ChangePasswordScreen> {
  final _formKey = GlobalKey<FormState>();
  final _currentPassword = TextEditingController();
  final _newPassword = TextEditingController();
  final _confirmPassword = TextEditingController();

  bool _saving = false;
  String? _errorMessage;

  bool _hideCurrent = true;
  bool _hideNew = true;
  bool _hideConfirm = true;

  @override
  void dispose() {
    _currentPassword.dispose();
    _newPassword.dispose();
    _confirmPassword.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (_saving || !_formKey.currentState!.validate()) return;

    setState(() {
      _saving = true;
      _errorMessage = null;
    });

    try {
      await widget.authService.changePassword(
        currentPassword: _currentPassword.text,
        newPassword: _newPassword.text,
      );
    } on ApiException catch (error) {
      if (!mounted) return;
      setState(() {
        _saving = false;
        _errorMessage = error.message;
      });
      return;
    }

    if (!mounted) return;
    Navigator.of(context).pop(true);
  }

  InputDecoration _fieldDecoration({
    required String label,
    required String hint,
    required IconData prefixIcon,
    required bool obscure,
    required VoidCallback onToggleObscure,
  }) {
    return InputDecoration(
      labelText: label,
      hintText: hint,
      filled: true,
      fillColor: AppColors.surfaceMuted.withValues(alpha: 0.45),
      prefixIcon: Icon(
        prefixIcon,
        color: AppColors.textSecondary,
        size: 20,
      ),
      suffixIcon: IconButton(
        tooltip: obscure ? 'Show password' : 'Hide password',
        onPressed: onToggleObscure,
        icon: Icon(
          obscure ? Icons.visibility_outlined : Icons.visibility_off_outlined,
          color: AppColors.textSecondary,
          size: 20,
        ),
      ),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: BorderSide(color: AppColors.border),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: BorderSide(color: AppColors.border),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        elevation: 0,
        scrolledUnderElevation: 0.5,
        backgroundColor: AppColors.surface,
        surfaceTintColor: Colors.transparent,
        title: const Text(
          'Change Password',
          style: TextStyle(
            color: AppColors.textPrimary,
            fontSize: 18,
            fontWeight: FontWeight.w800,
            letterSpacing: -0.3,
          ),
        ),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(1),
          child: Divider(
            height: 1,
            color: AppColors.border.withValues(alpha: 0.7),
          ),
        ),
      ),
      body: SafeArea(
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 520),
            child: Form(
              key: _formKey,
              child: ListView(
                padding: const EdgeInsets.fromLTRB(18, 18, 18, 32),
                children: [
                  // Security Header Banner
                  Container(
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      gradient: AppColors.primaryGradient,
                      borderRadius: BorderRadius.circular(24),
                      boxShadow: const [
                        BoxShadow(
                          color: Color(0x294F46E5),
                          blurRadius: 22,
                          offset: Offset(0, 10),
                        ),
                      ],
                    ),
                    child: Row(
                      children: [
                        Container(
                          width: 52,
                          height: 52,
                          decoration: BoxDecoration(
                            color: Colors.white.withValues(alpha: 0.16),
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(color: Colors.white24),
                          ),
                          child: const Icon(
                            Icons.shield_rounded,
                            color: Colors.white,
                            size: 27,
                          ),
                        ),
                        const SizedBox(width: 14),
                        const Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'ACCOUNT SECURITY',
                                style: TextStyle(
                                  color: Color(0xD9FFFFFF),
                                  fontSize: 10,
                                  fontWeight: FontWeight.w800,
                                  letterSpacing: 0.9,
                                ),
                              ),
                              SizedBox(height: 4),
                              Text(
                                'Update your password',
                                style: TextStyle(
                                  color: Colors.white,
                                  fontSize: 18,
                                  fontWeight: FontWeight.w800,
                                  letterSpacing: -0.2,
                                ),
                              ),
                              SizedBox(height: 3),
                              Text(
                                'Choose a strong password with at least 8 characters.',
                                style: TextStyle(
                                  color: Color(0xE6FFFFFF),
                                  fontSize: 12,
                                  height: 1.35,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 18),

                  // Password Form Card
                  Container(
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      color: AppColors.surface,
                      borderRadius: BorderRadius.circular(22),
                      border: Border.all(
                        color: AppColors.border.withValues(alpha: 0.85),
                      ),
                      boxShadow: const [
                        BoxShadow(
                          color: Color(0x07101828),
                          blurRadius: 16,
                          offset: Offset(0, 6),
                        ),
                      ],
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'VERIFY IDENTITY',
                          style: TextStyle(
                            color: AppColors.textSecondary,
                            fontSize: 10.5,
                            fontWeight: FontWeight.w800,
                            letterSpacing: 0.8,
                          ),
                        ),
                        const SizedBox(height: 10),
                        TextFormField(
                          controller: _currentPassword,
                          obscureText: _hideCurrent,
                          enabled: !_saving,
                          autofillHints: const [AutofillHints.password],
                          style: const TextStyle(
                            color: AppColors.textPrimary,
                            fontSize: 14.5,
                            fontWeight: FontWeight.w600,
                          ),
                          decoration: _fieldDecoration(
                            label: 'Current password',
                            hint: 'Enter your existing password',
                            prefixIcon: Icons.lock_outline_rounded,
                            obscure: _hideCurrent,
                            onToggleObscure: () {
                              setState(() => _hideCurrent = !_hideCurrent);
                            },
                          ),
                          validator: (value) => (value ?? '').isEmpty
                              ? 'Enter your current password.'
                              : null,
                        ),

                        const Padding(
                          padding: EdgeInsets.symmetric(vertical: 18),
                          child: Divider(height: 1),
                        ),

                        const Text(
                          'NEW CREDENTIALS',
                          style: TextStyle(
                            color: AppColors.textSecondary,
                            fontSize: 10.5,
                            fontWeight: FontWeight.w800,
                            letterSpacing: 0.8,
                          ),
                        ),
                        const SizedBox(height: 10),
                        TextFormField(
                          controller: _newPassword,
                          obscureText: _hideNew,
                          enabled: !_saving,
                          autofillHints: const [AutofillHints.newPassword],
                          style: const TextStyle(
                            color: AppColors.textPrimary,
                            fontSize: 14.5,
                            fontWeight: FontWeight.w600,
                          ),
                          decoration: _fieldDecoration(
                            label: 'New password',
                            hint: 'At least 8 characters',
                            prefixIcon: Icons.key_rounded,
                            obscure: _hideNew,
                            onToggleObscure: () {
                              setState(() => _hideNew = !_hideNew);
                            },
                          ),
                          validator: (value) {
                            final password = value ?? '';
                            if (password.length < 8) {
                              return 'Use at least 8 characters.';
                            }
                            if (utf8.encode(password).length > 72) {
                              return 'Use a password of at most 72 bytes.';
                            }
                            return null;
                          },
                        ),
                        const SizedBox(height: 14),
                        TextFormField(
                          controller: _confirmPassword,
                          obscureText: _hideConfirm,
                          enabled: !_saving,
                          style: const TextStyle(
                            color: AppColors.textPrimary,
                            fontSize: 14.5,
                            fontWeight: FontWeight.w600,
                          ),
                          decoration: _fieldDecoration(
                            label: 'Confirm new password',
                            hint: 'Re-enter your new password',
                            prefixIcon: Icons.verified_user_outlined,
                            obscure: _hideConfirm,
                            onToggleObscure: () {
                              setState(() => _hideConfirm = !_hideConfirm);
                            },
                          ),
                          validator: (value) =>
                              (value ?? '').isEmpty ||
                                      value != _newPassword.text
                                  ? 'The passwords must match.'
                                  : null,
                        ),
                      ],
                    ),
                  ),

                  // Inline Error Alert Banner
                  if (_errorMessage != null) ...[
                    const SizedBox(height: 16),
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
                              _errorMessage!,
                              style: const TextStyle(
                                color: AppColors.error,
                                fontSize: 13,
                                fontWeight: FontWeight.w600,
                                height: 1.4,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],

                  const SizedBox(height: 22),

                  // Primary Save CTA Button
                  SizedBox(
                    height: 54,
                    child: FilledButton.icon(
                      style: FilledButton.styleFrom(
                        backgroundColor: AppColors.primary,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(16),
                        ),
                      ),
                      onPressed: _saving ? null : _save,
                      icon: _saving
                          ? const SizedBox(
                              width: 19,
                              height: 19,
                              child: CircularProgressIndicator(
                                strokeWidth: 2.2,
                                color: Colors.white,
                              ),
                            )
                          : const Icon(Icons.check_circle_outline_rounded),
                      label: Text(
                        _saving ? 'Saving password…' : 'Save Password',
                        style: const TextStyle(
                          fontSize: 15.5,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}