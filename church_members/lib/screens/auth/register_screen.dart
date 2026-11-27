import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../core/network/api_exceptions.dart';
import '../../core/theme/app_colors.dart';
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
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(24),
            ),
            icon: Container(
              width: 66,
              height: 66,
              decoration: const BoxDecoration(
                color: Color(0xFFD1FAE5),
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.check_rounded,
                color: AppColors.success,
                size: 36,
              ),
            ),
            title: const Text(
              'Registration successful',
              style: TextStyle(fontWeight: FontWeight.w800),
            ),
            content: Text(
              'Your membership registration at '
              '${widget.church.name} was successful. '
              'You can now sign in.',
              textAlign: TextAlign.center,
              style: const TextStyle(
                color: AppColors.textSecondary,
                height: 1.45,
              ),
            ),
            actionsAlignment: MainAxisAlignment.center,
            actions: [
              FilledButton(
                style: FilledButton.styleFrom(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 24,
                    vertical: 12,
                  ),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14),
                  ),
                ),
                onPressed: () {
                  Navigator.pop(dialogContext);
                },
                child: const Text(
                  'Continue to login',
                  style: TextStyle(fontWeight: FontWeight.w700),
                ),
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
          backgroundColor: AppColors.error,
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
    if (error is ApiException) {
      if (error.statusCode == 401) {
        return 'This phone number already belongs to an account. Enter that account\'s current sign-in password and matching account details to join this church.';
      }

      return error.message;
    }

    final message = error.toString();

    if (message.startsWith('Exception: ')) {
      return message.substring('Exception: '.length);
    }

    return message;
  }

  Widget _buildTextField({
    required String label,
    String? hint,
    required TextEditingController controller,
    TextInputType keyboardType = TextInputType.text,
    String? Function(String?)? validator,
    bool obscureText = false,
    Widget? suffixIcon,
    IconData? prefixIcon,
    int maxLines = 1,
  }) {
    return TextFormField(
      controller: controller,
      keyboardType: keyboardType,
      obscureText: obscureText,
      maxLines: obscureText ? 1 : maxLines,
      validator: validator,
      style: const TextStyle(
        color: AppColors.textPrimary,
        fontSize: 14.5,
        fontWeight: FontWeight.w600,
      ),
      decoration: InputDecoration(
        labelText: label,
        hintText: hint,
        filled: true,
        fillColor: AppColors.surfaceMuted.withValues(alpha: 0.45),
        prefixIcon: prefixIcon == null
            ? null
            : Icon(prefixIcon, color: AppColors.textSecondary, size: 20),
        suffixIcon: suffixIcon,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: BorderSide(color: AppColors.border),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: BorderSide(color: AppColors.border),
        ),
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
          'Create Member Account',
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
            constraints: const BoxConstraints(maxWidth: 680),
            child: Form(
              key: _formKey,
              child: ListView(
                padding: const EdgeInsets.fromLTRB(18, 16, 18, 36),
                children: [
                  _ChurchRegistrationHeader(church: widget.church),
                  const SizedBox(height: 14),
                  const _ExistingAccountNotice(),
                  const SizedBox(height: 18),

                  // 1. Required Identity Card
                  _RegistrationSection(
                    stepLabel: 'REQUIRED',
                    icon: Icons.person_outline_rounded,
                    title: 'Basic information',
                    subtitle: 'Your primary member identity and contact details.',
                    child: Column(
                      children: [
                        _buildTextField(
                          label: 'Full name *',
                          hint: 'Enter your full name',
                          controller: _fullNameController,
                          prefixIcon: Icons.badge_outlined,
                          validator: (value) {
                            final error = _validateRequired(value, 'Full name');

                            if (error != null) return error;

                            if (value!.trim().length > 150) {
                              return 'Name cannot exceed 150 characters.';
                            }

                            return null;
                          },
                        ),
                        const SizedBox(height: 14),
                        _buildTextField(
                          label: 'Phone number *',
                          hint: 'e.g. 0911223344',
                          controller: _phoneController,
                          prefixIcon: Icons.phone_outlined,
                          keyboardType: TextInputType.phone,
                          validator: _validatePhone,
                        ),
                        const SizedBox(height: 14),
                        _buildTextField(
                          label: 'Email address (optional)',
                          hint: 'you@example.com',
                          controller: _emailController,
                          prefixIcon: Icons.email_outlined,
                          keyboardType: TextInputType.emailAddress,
                          validator: _validateEmail,
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 16),

                  // 2. Optional Profile Details Card
                  _RegistrationSection(
                    stepLabel: 'OPTIONAL',
                    icon: Icons.contact_page_outlined,
                    title: 'Additional profile details',
                    subtitle: 'Helps your church community know and support you.',
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Gender',
                          style: TextStyle(
                            color: AppColors.textSecondary,
                            fontSize: 12,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Row(
                          children: ['Male', 'Female', 'Other'].map((option) {
                            final isSelected = _gender == option;
                            return Expanded(
                              child: Padding(
                                padding: EdgeInsets.only(
                                  right: option == 'Other' ? 0 : 8,
                                ),
                                child: ChoiceChip(
                                  label: SizedBox(
                                    width: double.infinity,
                                    child: Text(
                                      option,
                                      textAlign: TextAlign.center,
                                    ),
                                  ),
                                  selected: isSelected,
                                  showCheckmark: false,
                                  onSelected: (selected) {
                                    setState(() {
                                      _gender = selected ? option : null;
                                    });
                                  },
                                  labelStyle: TextStyle(
                                    color: isSelected
                                        ? Colors.white
                                        : AppColors.textPrimary,
                                    fontSize: 13,
                                    fontWeight: FontWeight.w700,
                                  ),
                                  selectedColor: AppColors.primary,
                                  backgroundColor: AppColors.surfaceMuted
                                      .withValues(alpha: 0.6),
                                  side: BorderSide(
                                    color: isSelected
                                        ? AppColors.primary
                                        : AppColors.border,
                                  ),
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                  padding: const EdgeInsets.symmetric(
                                    vertical: 10,
                                  ),
                                ),
                              ),
                            );
                          }).toList(),
                        ),
                        const SizedBox(height: 14),
                        InkWell(
                          onTap: _selectDateOfBirth,
                          borderRadius: BorderRadius.circular(14),
                          child: Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 14,
                              vertical: 14,
                            ),
                            decoration: BoxDecoration(
                              color: AppColors.surfaceMuted.withValues(
                                alpha: 0.45,
                              ),
                              borderRadius: BorderRadius.circular(14),
                              border: Border.all(
                                color: _dateOfBirth != null
                                    ? AppColors.primary.withValues(alpha: 0.5)
                                    : AppColors.border,
                              ),
                            ),
                            child: Row(
                              children: [
                                Icon(
                                  Icons.cake_outlined,
                                  size: 20,
                                  color: _dateOfBirth != null
                                      ? AppColors.primary
                                      : AppColors.textSecondary,
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      const Text(
                                        'Date of birth',
                                        style: TextStyle(
                                          color: AppColors.textSecondary,
                                          fontSize: 11,
                                          fontWeight: FontWeight.w600,
                                        ),
                                      ),
                                      const SizedBox(height: 2),
                                      Text(
                                        _dateOfBirth == null
                                            ? 'Tap to select date'
                                            : DateFormat(
                                                'MMMM d, yyyy',
                                              ).format(_dateOfBirth!),
                                        style: TextStyle(
                                          color: _dateOfBirth == null
                                              ? AppColors.textSecondary
                                              : AppColors.textPrimary,
                                          fontSize: 14,
                                          fontWeight: FontWeight.w700,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                                const Icon(
                                  Icons.calendar_month_rounded,
                                  size: 19,
                                  color: AppColors.primary,
                                ),
                              ],
                            ),
                          ),
                        ),
                        const SizedBox(height: 14),
                        _buildTextField(
                          label: 'Address',
                          hint: 'City, sub-city, or neighborhood',
                          controller: _addressController,
                          prefixIcon: Icons.home_outlined,
                          maxLines: 2,
                        ),
                        const SizedBox(height: 14),
                        _buildTextField(
                          label: 'Emergency contact',
                          hint: 'Phone number of a trusted contact',
                          controller: _emergencyContactController,
                          prefixIcon: Icons.contact_emergency_outlined,
                          keyboardType: TextInputType.phone,
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 16),

                  // 3. Account Password Card
                  _RegistrationSection(
                    stepLabel: 'SECURITY',
                    icon: Icons.lock_outline_rounded,
                    title: 'Account password',
                    subtitle:
                        'Existing member? Use your current password. New member? Use 8+ characters.',
                    child: Column(
                      children: [
                        _buildTextField(
                          label: 'Account password *',
                          hint: 'Minimum 8 characters',
                          controller: _passwordController,
                          prefixIcon: Icons.key_rounded,
                          obscureText: _hidePassword,
                          validator: _validatePassword,
                          suffixIcon: IconButton(
                            tooltip: _hidePassword
                                ? 'Show password'
                                : 'Hide password',
                            onPressed: () {
                              setState(() {
                                _hidePassword = !_hidePassword;
                              });
                            },
                            icon: Icon(
                              _hidePassword
                                  ? Icons.visibility_outlined
                                  : Icons.visibility_off_outlined,
                            ),
                          ),
                        ),
                        const SizedBox(height: 14),
                        _buildTextField(
                          label: 'Confirm password *',
                          hint: 'Re-enter your password',
                          controller: _confirmPasswordController,
                          prefixIcon: Icons.verified_user_outlined,
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
                            tooltip: _hideConfirmPassword
                                ? 'Show password'
                                : 'Hide password',
                            onPressed: () {
                              setState(() {
                                _hideConfirmPassword = !_hideConfirmPassword;
                              });
                            },
                            icon: Icon(
                              _hideConfirmPassword
                                  ? Icons.visibility_outlined
                                  : Icons.visibility_off_outlined,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 18),

                  // Privacy Notice
                  Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: const Color(0xFFECFDF5),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: const Color(0xFFA7F3D0)),
                    ),
                    child: const Row(
                      crossAxisAlignment: CrossAxisAlignment.center,
                      children: [
                        Icon(
                          Icons.shield_rounded,
                          size: 19,
                          color: AppColors.success,
                        ),
                        SizedBox(width: 10),
                        Expanded(
                          child: Text(
                            'Your information is used only to create and manage your church membership.',
                            style: TextStyle(
                              color: Color(0xFF047857),
                              fontSize: 12,
                              fontWeight: FontWeight.w500,
                              height: 1.4,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 20),

                  // Submit CTA Button
                  SizedBox(
                    height: 54,
                    child: FilledButton.icon(
                      style: FilledButton.styleFrom(
                        backgroundColor: AppColors.primary,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(16),
                        ),
                      ),
                      onPressed: _isLoading ? null : _register,
                      icon: _isLoading
                          ? const SizedBox(
                              height: 20,
                              width: 20,
                              child: CircularProgressIndicator(
                                strokeWidth: 2.2,
                                color: Colors.white,
                              ),
                            )
                          : const Icon(Icons.person_add_alt_1_rounded),
                      label: Text(
                        _isLoading
                            ? 'Completing registration...'
                            : 'Complete registration',
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

class _ExistingAccountNotice extends StatelessWidget {
  const _ExistingAccountNotice();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFFFFFBEB),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFFDE68A)),
      ),
      child: const Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(Icons.info_outline_rounded, color: AppColors.warning, size: 20),
          SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Already have an account?',
                  style: TextStyle(
                    color: Color(0xFF92400E),
                    fontSize: 12.5,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                SizedBox(height: 2),
                Text(
                  'Use the same full name, phone, email, and current sign-in password. Do not create a different password.',
                  style: TextStyle(
                    color: Color(0xFF92400E),
                    fontSize: 11.5,
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

class _ChurchRegistrationHeader extends StatelessWidget {
  final ChurchModel church;

  const _ChurchRegistrationHeader({required this.church});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: AppColors.primaryGradient,
        borderRadius: BorderRadius.circular(24),
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
            right: -24,
            top: -30,
            child: Container(
              width: 110,
              height: 110,
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.09),
                shape: BoxShape.circle,
              ),
            ),
          ),
          Row(
            children: [
              _RegistrationChurchLogo(church: church),
              const SizedBox(width: 15),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 3,
                      ),
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.16),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: const Text(
                        'JOINING COMMUNITY',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 9.5,
                          fontWeight: FontWeight.w800,
                          letterSpacing: 0.8,
                        ),
                      ),
                    ),
                    const SizedBox(height: 7),
                    Text(
                      church.name,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 19,
                        fontWeight: FontWeight.w800,
                        height: 1.2,
                      ),
                    ),
                    const SizedBox(height: 7),
                    Row(
                      children: [
                        const Icon(
                          Icons.tag_rounded,
                          color: Colors.white70,
                          size: 13,
                        ),
                        const SizedBox(width: 4),
                        Text(
                          'Code: ${church.code}',
                          style: const TextStyle(
                            color: Color(0xE6FFFFFF),
                            fontSize: 12,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ],
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

class _RegistrationChurchLogo extends StatelessWidget {
  final ChurchModel church;

  const _RegistrationChurchLogo({required this.church});

  @override
  Widget build(BuildContext context) {
    final logoUrl = church.logoUrl;

    if (logoUrl == null || logoUrl.isEmpty) {
      return Container(
        width: 64,
        height: 64,
        decoration: BoxDecoration(
          color: Colors.white.withValues(alpha: 0.16),
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: Colors.white24),
        ),
        child: const Icon(Icons.church_rounded, color: Colors.white, size: 32),
      );
    }

    return ClipRRect(
      borderRadius: BorderRadius.circular(18),
      child: CachedNetworkImage(
        imageUrl: logoUrl,
        width: 64,
        height: 64,
        fit: BoxFit.cover,
        placeholder: (context, url) => const ColoredBox(
          color: Colors.white24,
          child: Center(
            child: CircularProgressIndicator(
              strokeWidth: 2,
              color: Colors.white,
            ),
          ),
        ),
        errorWidget: (context, url, error) => const ColoredBox(
          color: Colors.white24,
          child: Icon(Icons.church_rounded, color: Colors.white, size: 32),
        ),
      ),
    );
  }
}

class _RegistrationSection extends StatelessWidget {
  final String stepLabel;
  final IconData icon;
  final String title;
  final String subtitle;
  final Widget child;

  const _RegistrationSection({
    required this.stepLabel,
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.child,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: AppColors.border.withValues(alpha: 0.85)),
        boxShadow: const [
          BoxShadow(
            color: Color(0x06101828),
            blurRadius: 14,
            offset: Offset(0, 6),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: AppColors.primary.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(icon, color: AppColors.primary, size: 21),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Text(
                          title,
                          style: const TextStyle(
                            color: AppColors.textPrimary,
                            fontSize: 16,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                        const Spacer(),
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 8,
                            vertical: 2.5,
                          ),
                          decoration: BoxDecoration(
                            color: AppColors.surfaceMuted,
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(
                            stepLabel,
                            style: const TextStyle(
                              color: AppColors.textSecondary,
                              fontSize: 9.5,
                              fontWeight: FontWeight.w800,
                              letterSpacing: 0.6,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 2),
                    Text(
                      subtitle,
                      style: const TextStyle(
                        color: AppColors.textSecondary,
                        fontSize: 12,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 18),
          child,
        ],
      ),
    );
  }
}