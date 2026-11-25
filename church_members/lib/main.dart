import 'package:flutter/material.dart';

import 'core/network/api_client.dart';
import 'core/network/api_exceptions.dart';
import 'core/storage/token_storage.dart';
import 'core/theme/app_colors.dart';
import 'core/theme/app_theme.dart';
import 'models/user_model.dart';
import 'screens/auth/login_screen.dart';
import 'screens/dashboard/member_dashboard.dart';
import 'services/auth_service.dart';
import 'services/church_service.dart';
import 'services/event_service.dart';
import 'services/member_service.dart';
import 'services/notification_service.dart';
import 'services/payment_service.dart';
import 'services/post_service.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  final tokenStorage = TokenStorage();
  final apiClient = ApiClient(tokenStorage);
  final authService = AuthService(
    apiClient: apiClient,
    tokenStorage: tokenStorage,
  );
  final notificationService = NotificationService(apiClient);
  final churchService = ChurchService(apiClient);
  final memberService = MemberService(apiClient);
  final postService = PostService(apiClient);
  final eventService = EventService(apiClient);
  final paymentService = PaymentService(apiClient);
  runApp(
    ChurchMemberApp(
      authService: authService,
      churchService: churchService,
      memberService: memberService,
      postService: postService,
      eventService: eventService,
      paymentService: paymentService,
      notificationService: notificationService,
    ),
  );
}

class ChurchMemberApp extends StatelessWidget {
  final AuthService authService;
  final ChurchService churchService;
  final MemberService memberService;
  final PostService postService;
  final EventService eventService;
  final PaymentService paymentService;
  final NotificationService notificationService;

  const ChurchMemberApp({
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
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Church Member',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.lightTheme,
      home: _SessionGate(
        authService: authService,
        churchService: churchService,
        memberService: memberService,
        postService: postService,
        eventService: eventService,
        paymentService: paymentService,
        notificationService: notificationService,
      ),
    );
  }
}

class _SessionGate extends StatefulWidget {
  final AuthService authService;
  final ChurchService churchService;
  final MemberService memberService;
  final PostService postService;
  final EventService eventService;
  final PaymentService paymentService;
  final NotificationService notificationService;

  const _SessionGate({
    required this.authService,
    required this.churchService,
    required this.memberService,
    required this.postService,
    required this.eventService,
    required this.paymentService,
    required this.notificationService,
  });

  @override
  State<_SessionGate> createState() => _SessionGateState();
}

class _SessionGateState extends State<_SessionGate> {
  late Future<UserModel?> _session;

  @override
  void initState() {
    super.initState();
    _session = widget.authService.restoreSession();
  }

  void _retry() {
    setState(() {
      _session = widget.authService.restoreSession();
    });
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<UserModel?>(
      future: _session,
      builder: (context, snapshot) {
        if (snapshot.connectionState != ConnectionState.done) {
          return const _StartupLoadingScreen();
        }

        if (snapshot.hasError) {
          final error = snapshot.error;
          final message = error is ApiException
              ? error.message
              : 'Unable to restore your session. Please try again.';

          return _StartupErrorScreen(message: message, onRetry: _retry);
        }

        final user = snapshot.data;

        if (user == null) {
          return LoginScreen(
            authService: widget.authService,
            churchService: widget.churchService,
            memberService: widget.memberService,
            postService: widget.postService,
            eventService: widget.eventService,
            paymentService: widget.paymentService,
            notificationService: widget.notificationService,
          );
        }

        return MemberDashboard(
          user: user,
          authService: widget.authService,
          churchService: widget.churchService,
          memberService: widget.memberService,
          postService: widget.postService,
          eventService: widget.eventService,
          paymentService: widget.paymentService,
          notificationService: widget.notificationService,
        );
      },
    );
  }
}

class _StartupLoadingScreen extends StatelessWidget {
  const _StartupLoadingScreen();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Stack(
        children: [
          const Positioned(
            top: -100,
            right: -90,
            child: _StartupOrb(size: 250, color: Color(0x226366F1)),
          ),
          const Positioned(
            bottom: -90,
            left: -100,
            child: _StartupOrb(size: 240, color: Color(0x1F14B8A6)),
          ),
          Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 82,
                  height: 82,
                  decoration: BoxDecoration(
                    gradient: AppColors.primaryGradient,
                    borderRadius: BorderRadius.circular(26),
                    boxShadow: const [
                      BoxShadow(
                        color: Color(0x3D4F46E5),
                        blurRadius: 26,
                        offset: Offset(0, 12),
                      ),
                    ],
                  ),
                  child: const Icon(
                    Icons.church_rounded,
                    size: 43,
                    color: Colors.white,
                  ),
                ),
                const SizedBox(height: 22),
                const Text(
                  'Church Member',
                  style: TextStyle(
                    color: AppColors.textPrimary,
                    fontSize: 21,
                    fontWeight: FontWeight.w800,
                    letterSpacing: -0.3,
                  ),
                ),
                const SizedBox(height: 6),
                const Text(
                  'Connecting you to your community',
                  style: TextStyle(
                    color: AppColors.textSecondary,
                    fontSize: 12,
                  ),
                ),
                const SizedBox(height: 24),
                const SizedBox(
                  width: 28,
                  height: 28,
                  child: CircularProgressIndicator(strokeWidth: 2.6),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _StartupOrb extends StatelessWidget {
  final double size;
  final Color color;

  const _StartupOrb({required this.size, required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(color: color, shape: BoxShape.circle),
    );
  }
}

class _StartupErrorScreen extends StatelessWidget {
  final String message;
  final VoidCallback onRetry;

  const _StartupErrorScreen({required this.message, required this.onRetry});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 420),
              child: Container(
                padding: const EdgeInsets.all(26),
                decoration: BoxDecoration(
                  color: AppColors.surface,
                  borderRadius: BorderRadius.circular(24),
                  border: Border.all(color: AppColors.border),
                  boxShadow: const [
                    BoxShadow(
                      color: Color(0x14101828),
                      blurRadius: 28,
                      offset: Offset(0, 12),
                    ),
                  ],
                ),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      width: 66,
                      height: 66,
                      decoration: const BoxDecoration(
                        color: AppColors.surfaceMuted,
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(
                        Icons.cloud_off_rounded,
                        size: 32,
                        color: AppColors.textSecondary,
                      ),
                    ),
                    const SizedBox(height: 18),
                    const Text(
                      'Could not connect',
                      style: TextStyle(
                        fontSize: 21,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    const SizedBox(height: 9),
                    Text(
                      message,
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                        color: AppColors.textSecondary,
                        height: 1.5,
                      ),
                    ),
                    const SizedBox(height: 22),
                    SizedBox(
                      width: double.infinity,
                      child: FilledButton.icon(
                        onPressed: onRetry,
                        icon: const Icon(Icons.refresh_rounded),
                        label: const Text('Try Again'),
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
