import 'package:flutter/material.dart';

import '../../core/network/api_exceptions.dart';
import '../../core/theme/app_colors.dart';
import '../../services/auth_service.dart';
import '../../services/church_service.dart';
import '../../services/member_service.dart';
import '../../widgets/app_button.dart';
import '../../widgets/app_text_field.dart';
import '../churches/church_selection_screen.dart';
import '../dashboard/member_dashboard.dart';
import '../../services/post_service.dart';
import '../../services/event_service.dart';
import '../../services/payment_service.dart';
class LoginScreen extends StatefulWidget {
  final AuthService authService;
  final ChurchService churchService;
  final MemberService memberService;
final PostService postService;
final EventService eventService;
final PaymentService paymentService;
  const LoginScreen({
    super.key,
    required this.authService,
    required this.churchService,
    required this.memberService,
    required this.postService,
required this.eventService,
required this.paymentService,
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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 430),
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    const SizedBox(height: 25),

                    Container(
                      height: 82,
                      width: 82,
                      decoration: BoxDecoration(
                        color: AppColors.primary.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(24),
                      ),
                      child: const Icon(
                        Icons.church_rounded,
                        size: 45,
                        color: AppColors.primary,
                      ),
                    ),

                    const SizedBox(height: 28),

                    const Text(
                      'Welcome Back',
                      style: TextStyle(
                        fontSize: 30,
                        fontWeight: FontWeight.bold,
                        color: AppColors.textPrimary,
                      ),
                    ),

                    const SizedBox(height: 8),

                    const Text(
                      'Sign in to stay connected with your church.',
                      style: TextStyle(
                        fontSize: 15,
                        color: AppColors.textSecondary,
                      ),
                    ),

                    const SizedBox(height: 35),

                    AppTextField(
                      label: 'Phone, email, or member number',
                      hint: 'Enter your login identifier',
                      controller: _identifierController,
                      keyboardType: TextInputType.emailAddress,
                      validator: (value) {
                        if (value == null || value.trim().isEmpty) {
                          return 'Please enter your phone, email, or member number';
                        }
                        return null;
                      },
                    ),

                    const SizedBox(height: 20),

                    AppTextField(
                      label: 'Password',
                      hint: 'Enter your password',
                      controller: _passwordController,
                      obscureText: _obscurePassword,
                      suffixIcon: IconButton(
                        icon: Icon(
                          _obscurePassword
                              ? Icons.visibility_off
                              : Icons.visibility,
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

                    const SizedBox(height: 30),

                    AppButton(
                      text: 'Sign In',
                      loading: _loading,
                      onPressed: _login,
                    ),
                    const SizedBox(height: 16),

                    Center(
                      child: TextButton(
                        onPressed: () {
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
                        child: const Text("Don't have an account? Register"),
                      ),
                    ),
                    const SizedBox(height: 25),

                    const Center(
                      child: Text(
                        'Church Member Application',
                        style: TextStyle(
                          color: AppColors.textSecondary,
                          fontSize: 13,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
