import 'package:flutter/material.dart';

import '../../models/church_model.dart';
import '../../services/member_service.dart';

class RegisterScreen extends StatefulWidget {
  final ChurchModel church;
  final MemberService memberService;

  const RegisterScreen({
    super.key,
    required this.church,
    required this.memberService,
  });

  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  final _formKey = GlobalKey<FormState>();

  final _fullNameController = TextEditingController();
  final _phoneController = TextEditingController();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();
  final _addressController = TextEditingController();
  final _emergencyContactController = TextEditingController();

  String? _gender;
  DateTime? _dateOfBirth;

  bool _isLoading = false;
  bool _hidePassword = true;
  bool _hideConfirmPassword = true;

  @override
  void dispose() {
    _fullNameController.dispose();
    _phoneController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    _confirmPasswordController.dispose();
    _addressController.dispose();
    _emergencyContactController.dispose();
    super.dispose();
  }

  String? _validateRequired(String? value, String fieldName) {
    if (value == null || value.trim().isEmpty) {
      return '$fieldName is required.';
    }

    return null;
  }

  String? _validateEmail(String? value) {
    if (value == null || value.trim().isEmpty) {
      return null;
    }

    final emailPattern = RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$');

    if (!emailPattern.hasMatch(value.trim())) {
      return 'Enter a valid email address.';
    }

    if (value.trim().length > 150) {
      return 'Email cannot exceed 150 characters.';
    }

    return null;
  }

  String? _validatePhone(String? value) {
    if (value == null || value.trim().isEmpty) {
      return 'Phone number is required.';
    }

    if (value.trim().length < 7 || value.trim().length > 20) {
      return 'Phone number must contain 7–20 characters.';
    }

    return null;
  }

  String? _validatePassword(String? value) {
    if (value == null || value.isEmpty) {
      return 'Password is required.';
    }

    if (value.length < 8) {
      return 'Password must contain at least 8 characters.';
    }

    if (value.length > 72) {
      return 'Password cannot exceed 72 characters.';
    }

    return null;
  }

  Future<void> _selectDateOfBirth() async {
    final now = DateTime.now();

    final selected = await showDatePicker(
      context: context,
      initialDate: _dateOfBirth ?? DateTime(now.year - 18, now.month, now.day),
      firstDate: DateTime(1900),
      lastDate: now,
      helpText: 'Select date of birth',
    );

    if (selected != null) {
      setState(() {
        _dateOfBirth = selected;
      });
    }
  }

  Future<void> _register() async {
    if (!_formKey.currentState!.validate()) {
      return;
    }

    if (_passwordController.text != _confirmPasswordController.text) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Passwords do not match.')));
      return;
    }

    setState(() => _isLoading = true);

    try {
      final dateOfBirth = _dateOfBirth == null
          ? null
          : '${_dateOfBirth!.year.toString().padLeft(4, '0')}-'
                '${_dateOfBirth!.month.toString().padLeft(2, '0')}-'
                '${_dateOfBirth!.day.toString().padLeft(2, '0')}';

      await widget.memberService.registerMember(
        churchId: widget.church.id,
        fullName: _fullNameController.text,
        phone: _phoneController.text,
        password: _passwordController.text,
        email: _emailController.text,
        gender: _gender,
        dateOfBirth: dateOfBirth,
        address: _addressController.text,
        emergencyContact: _emergencyContactController.text,
      );

      if (!mounted) return;

      await showDialog<void>(
        context: context,
        barrierDismissible: false,
        builder: (dialogContext) {
          return AlertDialog(
            icon: const Icon(Icons.check_circle, color: Colors.green, size: 55),
            title: const Text('Registration successful'),
            content: Text(
              'Your membership registration at '
              '${widget.church.name} was successful. '
              'You can now sign in.',
            ),
            actions: [
              TextButton(
                onPressed: () {
                  Navigator.pop(dialogContext);
                },
                child: const Text('Continue to login'),
              ),
            ],
          );
        },
      );

      if (!mounted) return;

      Navigator.of(context).popUntil((route) => route.isFirst);
    } catch (error) {
      if (!mounted) return;

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(_readableError(error)),
          backgroundColor: Colors.red,
          duration: const Duration(seconds: 5),
        ),
      );
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  String _readableError(Object error) {
    final message = error.toString();

    if (message.startsWith('Exception: ')) {
      return message.substring('Exception: '.length);
    }

    return message;
  }

  Widget _buildTextField({
    required String label,
    required TextEditingController controller,
    TextInputType keyboardType = TextInputType.text,
    String? Function(String?)? validator,
    bool obscureText = false,
    Widget? suffixIcon,
    int maxLines = 1,
  }) {
    return TextFormField(
      controller: controller,
      keyboardType: keyboardType,
      obscureText: obscureText,
      maxLines: obscureText ? 1 : maxLines,
      validator: validator,
      decoration: InputDecoration(
        labelText: label,
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
        suffixIcon: suffixIcon,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Member Registration')),
      body: SafeArea(
        child: Form(
          key: _formKey,
          child: ListView(
            padding: const EdgeInsets.all(20),
            children: [
              const Icon(Icons.church_rounded, size: 48),
              const SizedBox(height: 12),

              Text(
                widget.church.name,
                textAlign: TextAlign.center,
                style: const TextStyle(
                  fontSize: 21,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 5),
              Text(
                'Church code: ${widget.church.code}',
                textAlign: TextAlign.center,
                style: const TextStyle(color: Colors.grey),
              ),
              const SizedBox(height: 25),

              const Text(
                'Personal information',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 15),

              _buildTextField(
                label: 'Full name *',
                controller: _fullNameController,
                validator: (value) {
                  final error = _validateRequired(value, 'Full name');

                  if (error != null) return error;

                  if (value!.trim().length > 150) {
                    return 'Name cannot exceed 150 characters.';
                  }

                  return null;
                },
              ),
              const SizedBox(height: 15),

              _buildTextField(
                label: 'Phone number *',
                controller: _phoneController,
                keyboardType: TextInputType.phone,
                validator: _validatePhone,
              ),
              const SizedBox(height: 15),

              _buildTextField(
                label: 'Email address (optional)',
                controller: _emailController,
                keyboardType: TextInputType.emailAddress,
                validator: _validateEmail,
              ),
              const SizedBox(height: 15),

              DropdownButtonFormField<String>(
                initialValue: _gender,
                decoration: InputDecoration(
                  labelText: 'Gender (optional)',
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                items: const [
                  DropdownMenuItem(value: 'Male', child: Text('Male')),
                  DropdownMenuItem(value: 'Female', child: Text('Female')),
                  DropdownMenuItem(value: 'Other', child: Text('Other')),
                ],
                onChanged: (value) {
                  setState(() => _gender = value);
                },
              ),
              const SizedBox(height: 15),

              OutlinedButton.icon(
                onPressed: _selectDateOfBirth,
                icon: const Icon(Icons.calendar_month),
                label: Text(
                  _dateOfBirth == null
                      ? 'Select date of birth (optional)'
                      : 'Date of birth: '
                            '${_dateOfBirth!.year}-'
                            '${_dateOfBirth!.month.toString().padLeft(2, '0')}-'
                            '${_dateOfBirth!.day.toString().padLeft(2, '0')}',
                ),
              ),
              const SizedBox(height: 15),

              _buildTextField(
                label: 'Address (optional)',
                controller: _addressController,
                maxLines: 2,
              ),
              const SizedBox(height: 15),

              _buildTextField(
                label: 'Emergency contact (optional)',
                controller: _emergencyContactController,
                keyboardType: TextInputType.phone,
              ),
              const SizedBox(height: 25),

              const Text(
                'Create your account',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 15),

              _buildTextField(
                label: 'Password *',
                controller: _passwordController,
                obscureText: _hidePassword,
                validator: _validatePassword,
                suffixIcon: IconButton(
                  onPressed: () {
                    setState(() {
                      _hidePassword = !_hidePassword;
                    });
                  },
                  icon: Icon(
                    _hidePassword ? Icons.visibility : Icons.visibility_off,
                  ),
                ),
              ),
              const SizedBox(height: 15),

              _buildTextField(
                label: 'Confirm password *',
                controller: _confirmPasswordController,
                obscureText: _hideConfirmPassword,
                validator: (value) {
                  if (value == null || value.isEmpty) {
                    return 'Please confirm your password.';
                  }

                  if (value != _passwordController.text) {
                    return 'Passwords do not match.';
                  }

                  return null;
                },
                suffixIcon: IconButton(
                  onPressed: () {
                    setState(() {
                      _hideConfirmPassword = !_hideConfirmPassword;
                    });
                  },
                  icon: Icon(
                    _hideConfirmPassword
                        ? Icons.visibility
                        : Icons.visibility_off,
                  ),
                ),
              ),
              const SizedBox(height: 25),

              SizedBox(
                height: 52,
                child: ElevatedButton(
                  onPressed: _isLoading ? null : _register,
                  child: _isLoading
                      ? const SizedBox(
                          height: 22,
                          width: 22,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Text(
                          'Create account',
                          style: TextStyle(fontSize: 16),
                        ),
                ),
              ),
              const SizedBox(height: 20),
            ],
          ),
        ),
      ),
    );
  }
}
