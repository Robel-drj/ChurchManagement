import 'package:flutter/material.dart';

import '../../core/network/api_exceptions.dart';
import '../../core/theme/app_colors.dart';
import '../../services/auth_service.dart';
import '../../services/church_service.dart';
import '../../services/event_service.dart';
import '../../services/member_service.dart';
import '../../services/notification_service.dart';
import '../../services/payment_service.dart';
import '../../services/post_service.dart';
import '../../widgets/app_button.dart';
import '../../widgets/app_text_field.dart';
import '../churches/church_selection_screen.dart';
import '../dashboard/member_dashboard.dart';

class LoginScreen extends StatefulWidget {
  final AuthService authService;
  final ChurchService churchService;
  final MemberService memberService;
  final PostService postService;
  final EventService eventService;
  final PaymentService paymentService;
  final NotificationService notificationService;

  const LoginScreen({
    super.key,
    required this.authService,
    required this.churchService,
    required this.memberService,
    required this.postService,
    required this.eventService,
    required this.paymentService,
    required this.notificationService,
  });

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _identifierController = TextEditingController();
  final _passwordController = TextEditingController();

  bool _loading = false;
  bool _obscurePassword = true;

  @override
  void dispose() {
    _identifierController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _login() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _loading = true);

    try {
      final user = await widget.authService.login(
        identifier: _identifierController.text.trim(),
        password: _passwordController.text,
      );

      if (!mounted) return;

      if (user.accountStatus != 'active') {
        await widget.authService.logout();

        if (!mounted) return;

        setState(() => _loading = false);

        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text(
              'Your account is not active. Please contact your church administrator.',
            ),
            backgroundColor: AppColors.error,
          ),
        );
        return;
      }

      Navigator.of(context).pushAndRemoveUntil(
        MaterialPageRoute(
          builder: (_) => MemberDashboard(
            user: user,
            authService: widget.authService,
            churchService: widget.churchService,
            memberService: widget.memberService,
            postService: widget.postService,
            eventService: widget.eventService,
            paymentService: widget.paymentService,
            notificationService: widget.notificationService,
          ),
        ),
        (route) => false,
      );
    } on ApiException catch (error) {
      if (!mounted) return;

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(error.message),
          backgroundColor: AppColors.error,
        ),
      );
    } catch (error) {
      if (!mounted) return;

      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Unable to sign in. Please try again.'),
          backgroundColor: AppColors.error,
        ),
      );
    } finally {
      if (mounted) {
        setState(() => _loading = false);
      }
    }
  }

  void _showForgotPasswordDialog() {
    showDialog<void>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(22)),
        icon: Container(
          width: 48,
          height: 48,
          decoration: BoxDecoration(
            color: AppColors.primary.withValues(alpha: 0.1),
            shape: BoxShape.circle,
          ),
          child: const Icon(
            Icons.lock_reset_rounded,
            color: AppColors.primary,
            size: 26,
          ),
        ),
        title: const Text(
          'Forgot password?',
          style: TextStyle(fontWeight: FontWeight.w800),
        ),
        content: const Text(
          'Contact your church administrator to reset your password.',
          textAlign: TextAlign.center,
          style: TextStyle(
            color: AppColors.textSecondary,
            height: 1.45,
          ),
        ),
        actionsAlignment: MainAxisAlignment.center,
        actions: [
          FilledButton(
            style: FilledButton.styleFrom(
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
            ),
            onPressed: () => Navigator.of(dialogContext).pop(),
            child: const Text('Got it'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: Stack(
        children: [
          // Soft Ambient Background Glows
          const Positioned(
            top: -120,
            right: -90,
            child: _AmbientCircle(size: 280, color: Color(0x1E6366F1)),
          ),
          const Positioned(
            bottom: -90,
            left: -110,
            child: _AmbientCircle(size: 240, color: Color(0x1414B8A6)),
          ),
          SafeArea(
            child: LayoutBuilder(
              builder: (context, constraints) {
                return SingleChildScrollView(
                  padding: const EdgeInsets.fromLTRB(22, 24, 22, 24),
                  child: Center(
                    child: ConstrainedBox(
                      constraints: BoxConstraints(
                        maxWidth: 430,
                        minHeight: constraints.maxHeight - 48,
                      ),
                      child: Form(
                        key: _formKey,
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            // Centered Social Community Brand Header
                            const _BrandHeader(),
                            const SizedBox(height: 28),

                            // Main Sign-In Card
                            Container(
                              padding: const EdgeInsets.all(22),
                              decoration: BoxDecoration(
                                color: AppColors.surface,
                                borderRadius: BorderRadius.circular(26),
                                border: Border.all(
                                  color: AppColors.border.withValues(alpha: 0.9),
                                ),
                                boxShadow: const [
                                  BoxShadow(
                                    color: Color(0x0D101828),
                                    blurRadius: 28,
                                    offset: Offset(0, 12),
                                  ),
                                ],
                              ),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.stretch,
                                children: [
                                  const Text(
                                    'Sign in to your account',
                                    style: TextStyle(
                                      color: AppColors.textPrimary,
                                      fontSize: 18,
                                      fontWeight: FontWeight.w800,
                                      letterSpacing: -0.3,
                                    ),
                                  ),
                                  const SizedBox(height: 4),
                                  const Text(
                                    'Stay connected with posts, events, and giving.',
                                    style: TextStyle(
                                      color: AppColors.textSecondary,
                                      fontSize: 13,
                                    ),
                                  ),
                                  const SizedBox(height: 22),
                                  AppTextField(
                                    label: 'Phone, email, or member number',
                                    hint: 'Enter your Email,Phone Number',
                                    controller: _identifierController,
                                    keyboardType: TextInputType.emailAddress,
                                    prefixIcon: const Icon(
                                      Icons.email_outlined,
                                    ),
                                    validator: (value) {
                                      if (value == null ||
                                          value.trim().isEmpty) {
                                        return 'Please enter your phone, email, or member number';
                                      }
                                      return null;
                                    },
                                  ),
                                  const SizedBox(height: 16),
                                  AppTextField(
                                    label: 'Password',
                                    hint: 'Enter your password',
                                    controller: _passwordController,
                                    obscureText: _obscurePassword,
                                    prefixIcon: const Icon(
                                      Icons.lock_outline_rounded,
                                    ),
                                    suffixIcon: IconButton(
                                      tooltip: _obscurePassword
                                          ? 'Show password'
                                          : 'Hide password',
                                      icon: Icon(
                                        _obscurePassword
                                            ? Icons.visibility_off_outlined
                                            : Icons.visibility_outlined,
                                      ),
                                      onPressed: () {
                                        setState(() {
                                          _obscurePassword = !_obscurePassword;
                                        });
                                      },
                                    ),
                                    validator: (value) {
                                      if (value == null || value.isEmpty) {
                                        return 'Please enter your password';
                                      }
                                      return null;
                                    },
                                  ),
                                  const SizedBox(height: 6),
                                  Align(
                                    alignment: Alignment.centerRight,
                                    child: TextButton(
                                      style: TextButton.styleFrom(
                                        padding: const EdgeInsets.symmetric(
                                          horizontal: 6,
                                          vertical: 4,
                                        ),
                                        minimumSize: Size.zero,
                                        tapTargetSize:
                                            MaterialTapTargetSize.shrinkWrap,
                                      ),
                                      onPressed: _showForgotPasswordDialog,
                                      child: const Text(
                                        'Forgot password?',
                                        style: TextStyle(
                                          fontSize: 13,
                                          fontWeight: FontWeight.w700,
                                        ),
                                      ),
                                    ),
                                  ),
                                  const SizedBox(height: 20),
                                  AppButton(
                                    text: 'Sign In',
                                    loading: _loading,
                                    onPressed: _login,
                                  ),
                                  const SizedBox(height: 14),
                                  const Row(
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    children: [
                                      Icon(
                                        Icons.verified_user_rounded,
                                        size: 14,
                                        color: AppColors.success,
                                      ),
                                      SizedBox(width: 6),
                                      Text(
                                        'Encrypted member session',
                                        style: TextStyle(
                                          color: AppColors.textSecondary,
                                          fontSize: 11.5,
                                          fontWeight: FontWeight.w600,
                                        ),
                                      ),
                                    ],
                                  ),
                                ],
                              ),
                            ),

                            const SizedBox(height: 20),

                            // Social Sign-Up Footer Pill
                            InkWell(
                              borderRadius: BorderRadius.circular(18),
                              onTap: () {
                                Navigator.push(
                                  context,
                                  MaterialPageRoute(
                                    builder: (_) => ChurchSelectionScreen(
                                      churchService: widget.churchService,
                                      memberService: widget.memberService,
                                    ),
                                  ),
                                );
                              },
                              child: Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 18,
                                  vertical: 15,
                                ),
                                decoration: BoxDecoration(
                                  color: AppColors.surface,
                                  borderRadius: BorderRadius.circular(18),
                                  border: Border.all(
                                    color: AppColors.border.withValues(
                                      alpha: 0.9,
                                    ),
                                  ),
                                ),
                                child: const Row(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    Text(
                                      "Don't have an account? ",
                                      style: TextStyle(
                                        color: AppColors.textSecondary,
                                        fontSize: 13.5,
                                        fontWeight: FontWeight.w500,
                                      ),
                                    ),
                                    Text(
                                      'Register',
                                      style: TextStyle(
                                        color: AppColors.primary,
                                        fontSize: 13.5,
                                        fontWeight: FontWeight.w800,
                                      ),
                                    ),
                                    SizedBox(width: 4),
                                    Icon(
                                      Icons.arrow_forward_rounded,
                                      size: 15,
                                      color: AppColors.primary,
                                    ),
                                  ],
                                ),
                              ),
                            ),

                            const SizedBox(height: 22),

                            const Center(
                              child: Text(
                                'Church Member • Connect • Grow • Give',
                                style: TextStyle(
                                  color: AppColors.textSecondary,
                                  fontSize: 11.5,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

class _BrandHeader extends StatelessWidget {
  const _BrandHeader();

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Container(
          padding: const EdgeInsets.all(4),
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            border: Border.all(
              color: AppColors.primary.withValues(alpha: 0.2),
              width: 1.5,
            ),
          ),
          child: Container(
            width: 68,
            height: 68,
            decoration: const BoxDecoration(
              gradient: AppColors.primaryGradient,
              shape: BoxShape.circle,
              boxShadow: [
                BoxShadow(
                  color: Color(0x384F46E5),
                  blurRadius: 20,
                  offset: Offset(0, 8),
                ),
              ],
            ),
            child: const Icon(
              Icons.church_rounded,
              size: 34,
              color: Colors.white,
            ),
          ),
        ),
        const SizedBox(height: 16),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
          decoration: BoxDecoration(
            color: AppColors.primary.withValues(alpha: 0.09),
            borderRadius: BorderRadius.circular(20),
          ),
          child: const Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                Icons.favorite_rounded,
                size: 13,
                color: AppColors.primary,
              ),
              SizedBox(width: 5),
              Text(
                'YOUR CHURCH, ALWAYS CLOSE',
                style: TextStyle(
                  color: AppColors.primary,
                  fontSize: 10,
                  fontWeight: FontWeight.w800,
                  letterSpacing: 0.7,
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        Text(
          'Welcome Back',
          textAlign: TextAlign.center,
          style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                color: AppColors.textPrimary,
                fontWeight: FontWeight.w900,
                letterSpacing: -0.5,
              ),
        ),
      ],
    );
  }
}

class _AmbientCircle extends StatelessWidget {
  final double size;
  final Color color;

  const _AmbientCircle({required this.size, required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(color: color, shape: BoxShape.circle),
    );
  }
}