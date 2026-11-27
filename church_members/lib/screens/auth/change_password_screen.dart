import 'dart:convert';

import 'package:flutter/material.dart';

import '../../core/network/api_exceptions.dart';
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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Change Password')),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            TextFormField(
              controller: _currentPassword,
              obscureText: true,
              enabled: !_saving,
              autofillHints: const [AutofillHints.password],
              decoration: const InputDecoration(labelText: 'Current password'),
              validator: (value) => (value ?? '').isEmpty
                  ? 'Enter your current password.'
                  : null,
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _newPassword,
              obscureText: true,
              enabled: !_saving,
              autofillHints: const [AutofillHints.newPassword],
              decoration: const InputDecoration(labelText: 'New password'),
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
            const SizedBox(height: 16),
            TextFormField(
              controller: _confirmPassword,
              obscureText: true,
              enabled: !_saving,
              decoration: const InputDecoration(
                labelText: 'Confirm new password',
              ),
              validator: (value) =>
                  (value ?? '').isEmpty || value != _newPassword.text
                      ? 'The passwords must match.'
                      : null,
            ),
            if (_errorMessage != null) ...[
              const SizedBox(height: 16),
              Text(
                _errorMessage!,
                style: TextStyle(color: Theme.of(context).colorScheme.error),
              ),
            ],
            const SizedBox(height: 24),
            FilledButton(
              onPressed: _saving ? null : _save,
              child: Text(_saving ? 'Saving…' : 'Save Password'),
            ),
          ],
        ),
      ),
    );
  }
}