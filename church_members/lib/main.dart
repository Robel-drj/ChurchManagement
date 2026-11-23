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

  const ChurchMemberApp({
    super.key,
    required this.authService,
    required this.churchService,
    required this.memberService,
    required this.postService,
    required this.eventService,
    required this.paymentService,
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

  const _SessionGate({
    required this.authService,
    required this.churchService,
    required this.memberService,
    required this.postService,
    required this.eventService,
    required this.paymentService,
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
        );
      },
    );
  }
}

class _StartupLoadingScreen extends StatelessWidget {
  const _StartupLoadingScreen();

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      body: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.church_rounded, size: 58, color: AppColors.primary),
            SizedBox(height: 22),
            CircularProgressIndicator(),
          ],
        ),
      ),
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
          child: Padding(
            padding: const EdgeInsets.all(28),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 420),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(
                    Icons.cloud_off_rounded,
                    size: 54,
                    color: AppColors.textSecondary,
                  ),
                  const SizedBox(height: 20),
                  const Text(
                    'Could not connect',
                    style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 10),
                  Text(
                    message,
                    textAlign: TextAlign.center,
                    style: const TextStyle(
                      color: AppColors.textSecondary,
                      height: 1.4,
                    ),
                  ),
                  const SizedBox(height: 24),
                  FilledButton.icon(
                    onPressed: onRetry,
                    icon: const Icon(Icons.refresh),
                    label: const Text('Try Again'),
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
