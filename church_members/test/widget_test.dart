import 'package:flutter_test/flutter_test.dart';
import 'package:church_members/main.dart';
import 'package:church_members/core/network/api_client.dart';
import 'package:church_members/core/storage/token_storage.dart';
import 'package:church_members/services/auth_service.dart';
import 'package:church_members/services/church_service.dart';
import 'package:church_members/services/event_service.dart';
import 'package:church_members/services/member_service.dart';
import 'package:church_members/services/notification_service.dart';
import 'package:church_members/services/payment_service.dart';
import 'package:church_members/services/post_service.dart';

class FakeTokenStorage implements TokenStore {
  String? accessToken;
  String? refreshToken;

  @override
  Future<void> clearTokens() async {
    accessToken = null;
    refreshToken = null;
  }

  @override
  Future<String?> getAccessToken() async => accessToken;

  @override
  Future<String?> getRefreshToken() async => refreshToken;

  @override
  Future<bool> hasAccessToken() async => accessToken?.isNotEmpty ?? false;

  @override
  Future<void> saveTokens({
    required String accessToken,
    required String refreshToken,
  }) async {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
  }
}

void main() {
  testWidgets('Church Member app starts', (WidgetTester tester) async {
    final tokenStorage = FakeTokenStorage();
    final apiClient = ApiClient(tokenStorage);
    final authService = AuthService(
      apiClient: apiClient,
      tokenStorage: tokenStorage,
    );

    await tester.pumpWidget(
      ChurchMemberApp(
        authService: authService,
        churchService: ChurchService(apiClient),
        memberService: MemberService(apiClient),
        postService: PostService(apiClient),
        eventService: EventService(apiClient),
        paymentService: PaymentService(apiClient),
        notificationService: NotificationService(apiClient),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Welcome Back'), findsOneWidget);
    expect(find.text('Church Member Application'), findsOneWidget);
  });
}
