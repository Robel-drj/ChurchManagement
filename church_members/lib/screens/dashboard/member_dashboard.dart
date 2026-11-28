import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:intl/intl.dart';

import '../../core/network/api_exceptions.dart';
import '../../core/theme/app_colors.dart';
import '../../models/user_model.dart';
import '../../services/auth_service.dart';
import '../../services/church_service.dart';
import '../../services/event_service.dart';
import '../../services/member_service.dart';
import '../../services/notification_service.dart';
import '../../services/payment_service.dart';
import '../../services/post_service.dart';
import '../../widgets/content_media_gallery.dart';
import '../../widgets/post_like_button.dart';
import '../auth/change_password_screen.dart';
import '../auth/login_screen.dart';
import '../posts/post_details_screen.dart';
import 'member_payments_page.dart';
import 'notification_bell_button.dart';
import '../../core/theme/theme_settings.dart';
class MemberDashboard extends StatefulWidget {
  final UserModel user;
  final AuthService authService;
  final ChurchService churchService;
  final MemberService memberService;
  final PostService postService;
  final EventService eventService;
  final PaymentService paymentService;
  final NotificationService notificationService;

  const MemberDashboard({
    super.key,
    required this.user,
    required this.authService,
    required this.churchService,
    required this.memberService,
    required this.postService,
    required this.eventService,
    required this.paymentService,
    required this.notificationService,
  });

  @override
  State<MemberDashboard> createState() => _MemberDashboardState();
}

class _MemberDashboardState extends State<MemberDashboard> {
  int _selectedIndex = 0;
  String? _uploadedPhotoUrl;
  bool _uploadingPhoto = false;

  String? get _profilePhotoUrl {
    final churchId = _activeChurchId;
    if (churchId == null) return null;
    if (_uploadedPhotoUrl != null) return _uploadedPhotoUrl;

    for (final membership in widget.user.memberships) {
      if (membership is Map &&
          (membership['churchId'] ?? membership['church_id']) == churchId) {
        final url = membership['profileImage'];
        return url is String && url.isNotEmpty ? url : null;
      }
    }

    return null;
  }

  Future<void> _changeProfilePicture() async {
    final churchId = _activeChurchId;
    if (churchId == null || _uploadingPhoto) return;

    setState(() => _uploadingPhoto = true);

    try {
      final photo = await ImagePicker().pickImage(source: ImageSource.gallery);
      if (photo == null || !mounted) return;

      final url = await widget.memberService.uploadProfilePicture(churchId, photo);
      if (!mounted) return;

      setState(() => _uploadedPhotoUrl = url);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Profile picture updated.')),
      );
    } on ApiException catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(error.message)),
      );
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Could not change your profile picture.')),
      );
    } finally {
      if (mounted) setState(() => _uploadingPhoto = false);
    }
  }

  String? get _activeChurchId {
    for (final item in widget.user.memberships) {
      if (item is! Map) continue;

      final membership = Map<String, dynamic>.from(item);

      final status =
          (membership['membership_status'] ??
                  membership['membershipStatus'] ??
                  membership['status'] ??
                  '')
              .toString()
              .toLowerCase();

      final churchId = (membership['church_id'] ?? membership['churchId'] ?? '')
          .toString();

      if (status == 'active' && churchId.isNotEmpty) {
        return churchId;
      }
    }

    return null;
  }

  Future<void> _openChangePassword() async {
    final changed = await Navigator.of(context).push<bool>(
      MaterialPageRoute(
        builder: (_) => ChangePasswordScreen(authService: widget.authService),
      ),
    );

    if (!mounted || changed != true) return;

    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Password changed successfully.')),
    );
  }

  Future<void> _logout() async {
    await widget.authService.logout();

    if (!mounted) return;

    Navigator.of(context).pushAndRemoveUntil(
      MaterialPageRoute(
        builder: (_) => LoginScreen(
          authService: widget.authService,
          churchService: widget.churchService,
          memberService: widget.memberService,
          postService: widget.postService,
          eventService: widget.eventService,
          paymentService: widget.paymentService,
          notificationService: widget.notificationService,
        ),
      ),
      (_) => false,
    );
  }

  @override
  Widget build(BuildContext context) {
    final churchId = _activeChurchId;

    final pages = [
      _HomeTab(
        user: widget.user,
        churchId: churchId,
        postService: widget.postService,
        eventService: widget.eventService,
        notificationService: widget.notificationService,
        photoUrl: _profilePhotoUrl,
        onViewAllEvents: () => setState(() => _selectedIndex = 2),
        onViewAllPosts: () => setState(() => _selectedIndex = 1),
      ),
      _PostsTab(churchId: churchId, postService: widget.postService),
      _EventsTab(churchId: churchId, eventService: widget.eventService),
      _PaymentsTab(churchId: churchId, paymentService: widget.paymentService),
      _ProfileTab(
        user: widget.user,
        photoUrl: _profilePhotoUrl,
        uploadingPhoto: _uploadingPhoto,
        onChangePhoto: churchId == null ? null : _changeProfilePicture,
        onLogout: _logout,
        onChangePassword: _openChangePassword,
      ),
    ];

    return Scaffold(
      
      body: SafeArea(
        bottom: false,
        child: IndexedStack(index: _selectedIndex, children: pages),
      ),
     bottomNavigationBar: DecoratedBox(
  decoration: BoxDecoration(
    color: Theme.of(context).colorScheme.surface,
          border: Border(
            top: BorderSide(color: AppColors.border.withValues(alpha: 0.8)),
          ),
          boxShadow: const [
            BoxShadow(
              color: Color(0x0A101828),
              blurRadius: 24,
              offset: Offset(0, -4),
            ),
          ],
        ),
        child: SafeArea(
          top: false,
          child: NavigationBar(
            height: 66,
            elevation: 0,
           backgroundColor: Theme.of(context).colorScheme.surface,
            indicatorColor: AppColors.primary.withValues(alpha: 0.12),
            labelBehavior: NavigationDestinationLabelBehavior.alwaysShow,
            selectedIndex: _selectedIndex,
            onDestinationSelected: (index) {
              setState(() => _selectedIndex = index);
            },
            destinations: const [
              NavigationDestination(
                icon: Icon(Icons.home_outlined),
                selectedIcon: Icon(Icons.home_rounded, color: AppColors.primary),
                label: 'Feed',
              ),
              NavigationDestination(
                icon: Icon(Icons.explore_outlined),
                selectedIcon: Icon(Icons.explore_rounded, color: AppColors.primary),
                label: 'Posts',
              ),
              NavigationDestination(
                icon: Icon(Icons.calendar_today_outlined),
                selectedIcon: Icon(Icons.calendar_month_rounded, color: AppColors.primary),
                label: 'Events',
              ),
              NavigationDestination(
                icon: Icon(Icons.volunteer_activism_outlined),
                selectedIcon: Icon(Icons.volunteer_activism_rounded, color: AppColors.primary),
                label: 'Giving',
              ),
              NavigationDestination(
                icon: Icon(Icons.person_outline_rounded),
                selectedIcon: Icon(Icons.person_rounded, color: AppColors.primary),
                label: 'Profile',
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ============================================================================
// HOME FEED TAB (Social App Bar + Horizontal Event Highlights + Social Feed)
// ============================================================================

class _HomeTab extends StatelessWidget {
  final UserModel user;
  final String? churchId;
  final PostService postService;
  final EventService eventService;
  final NotificationService notificationService;
  final String? photoUrl;
  final VoidCallback onViewAllEvents;
  final VoidCallback onViewAllPosts;

  const _HomeTab({
    required this.user,
    required this.churchId,
    required this.postService,
    required this.eventService,
    required this.notificationService,
    required this.photoUrl,
    required this.onViewAllEvents,
    required this.onViewAllPosts,
  });

  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
      color: Theme.of(context).colorScheme.onSurface,
      onRefresh: () async {
        if (churchId == null) return;
        await Future.wait([
          postService.getPublishedPosts(churchId!),
          eventService.getPublishedEvents(churchId!),
        ]);
      },
      child: CustomScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        slivers: [
          // Sticky Social Top Bar
          SliverAppBar(
            floating: true,
            snap: true,
            elevation: 0,
            scrolledUnderElevation: 0.5,
           backgroundColor: Theme.of(context).colorScheme.surface,
            toolbarHeight: 68,
            titleSpacing: 18,
            title: _SocialTopBar(
              user: user,
              churchId: churchId,
              notificationService: notificationService,
              photoUrl: photoUrl,
            ),
          ),

          if (churchId == null)
            const SliverFillRemaining(
              hasScrollBody: false,
              child: Padding(
                padding: EdgeInsets.all(20),
                child: Center(
                  child: _EmptyMessage(
                    icon: Icons.link_off_rounded,
                    title: 'No active membership',
                    message: 'No active church membership was found.',
                  ),
                ),
              ),
            )
          else ...[
            // Horizontal "Stories / Upcoming Events" Strip
            SliverToBoxAdapter(
              child: Container(
               color: Theme.of(context).colorScheme.surface,
                padding: const EdgeInsets.only(top: 6, bottom: 18),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 18),
                      child: Row(
                        children: [
                           Text(
                            'Upcoming Gatherings',
                            style: TextStyle(
                              color: Theme.of(context).colorScheme.onSurface,
                              fontSize: 15,
                              fontWeight: FontWeight.w800,
                              letterSpacing: -0.2,
                            ),
                          ),
                          const Spacer(),
                          GestureDetector(
                            onTap: onViewAllEvents,
                            child: const Text(
                              'See all',
                              style: TextStyle(
                                color: AppColors.primary,
                                fontSize: 13,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 12),
                    FutureBuilder<List>(
                      future: eventService.getPublishedEvents(churchId!),
                      builder: (context, snapshot) {
                        if (snapshot.connectionState == ConnectionState.waiting) {
                          return SizedBox(
                            height: 112,
                            child: ListView.separated(
                              scrollDirection: Axis.horizontal,
                              padding: const EdgeInsets.symmetric(horizontal: 18),
                              itemCount: 3,
                              separatorBuilder: (_, _) => const SizedBox(width: 12),
                              itemBuilder: (_, _) => const _Placeholder(
                                width: 220,
                                height: 112,
                                radius: 18,
                              ),
                            ),
                          );
                        }
                        final events = snapshot.data ?? [];
                        if (events.isEmpty) {
                          return Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 18),
                            child: Container(
                              padding: const EdgeInsets.all(14),
                              decoration: BoxDecoration(
                                color: Theme.of(context).colorScheme.surfaceContainerHighest,
                                borderRadius: BorderRadius.circular(14),
                              ),
                              child: Row(
                                children: [
                                  Icon(
                                    Icons.event_available_outlined,
                                    size: 18,
                                   color: Theme.of(context).colorScheme.onSurfaceVariant,
                                  ),
                                  SizedBox(width: 10),
                                  Text(
                                    'No upcoming events scheduled yet.',
                                    style: TextStyle(
                                      color: Theme.of(context).colorScheme.onSurfaceVariant,
                                      fontSize: 13,
                                      fontWeight: FontWeight.w500,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          );
                        }

                        return SizedBox(
                          height: 116,
                          child: ListView.separated(
                            scrollDirection: Axis.horizontal,
                            padding: const EdgeInsets.symmetric(horizontal: 18),
                            itemCount: events.take(6).length,
                            separatorBuilder: (_, _) => const SizedBox(width: 12),
                            itemBuilder: (context, index) {
                              return _EventStoryCard(
                                event: events[index],
                                onTap: onViewAllEvents,
                              );
                            },
                          ),
                        );
                      },
                    ),
                  ],
                ),
              ),
            ),

            // Feed Section Header
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(18, 18, 18, 10),
                child: Row(
                  children: [
                     Text(
                      'Community Feed',
                      style: TextStyle(
                       color: Theme.of(context).colorScheme.onSurface,
                        fontSize: 16,
                        fontWeight: FontWeight.w800,
                        letterSpacing: -0.2,
                      ),
                    ),
                    const Spacer(),
                    GestureDetector(
                      onTap: onViewAllPosts,
                      child: const Text(
                        'View all posts',
                        style: TextStyle(
                          color: AppColors.primary,
                          fontSize: 13,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),

            // Social Feed Stream
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(16, 4, 16, 28),
              sliver: FutureBuilder<List>(
                future: postService.getPublishedPosts(churchId!),
                builder: (context, snapshot) {
                  if (snapshot.connectionState == ConnectionState.waiting) {
                    return const SliverToBoxAdapter(
                      child: _LoadingCards(count: 2),
                    );
                  }
                  if (snapshot.hasError) {
                    return const SliverToBoxAdapter(
                      child: _EmptyMessage(
                        icon: Icons.cloud_off_outlined,
                        title: 'Feed unavailable',
                        message: 'Could not load the latest posts.',
                      ),
                    );
                  }
                  final posts = snapshot.data ?? [];
                  if (posts.isEmpty) {
                    return const SliverToBoxAdapter(
                      child: _EmptyMessage(
                        icon: Icons.dynamic_feed_outlined,
                        title: 'Your feed is quiet',
                        message: 'There are no published posts yet.',
                      ),
                    );
                  }

                  final visiblePosts = posts.take(5).toList();
                  return SliverList(
                    delegate: SliverChildBuilderDelegate(
                      (context, index) {
                        return _ContentCard(
                          data: visiblePosts[index],
                          type: 'post',
                          churchId: churchId,
                          postService: postService,
                        );
                      },
                      childCount: visiblePosts.length,
                    ),
                  );
                },
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _SocialTopBar extends StatelessWidget {
  final UserModel user;
  final String? churchId;
  final NotificationService notificationService;
  final String? photoUrl;

  const _SocialTopBar({
    required this.user,
    required this.churchId,
    required this.notificationService,
    required this.photoUrl,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        // Story-style Gradient Ring around User Avatar
       GestureDetector(
  onTap: photoUrl == null || photoUrl!.isEmpty
      ? null
      : () => _viewProfilePicture(context, photoUrl),
  child: Container(
    padding: const EdgeInsets.all(2.2),
    decoration: const BoxDecoration(
      gradient: AppColors.primaryGradient,
      shape: BoxShape.circle,
    ),
    child: Container(
      padding: const EdgeInsets.all(1.5),
      decoration:  BoxDecoration(
       color: Theme.of(context).colorScheme.surface,
        shape: BoxShape.circle,
      ),
      child: CircleAvatar(
        radius: 20,
        backgroundColor: const Color(0xFFE0E7FF),
        foregroundImage: photoUrl == null ? null : NetworkImage(photoUrl!),
        onForegroundImageError: photoUrl == null ? null : (_, _) {},
        child: Text(
          _initials(user.fullName),
          style: const TextStyle(
            color: AppColors.primary,
            fontSize: 13,
            fontWeight: FontWeight.w800,
          ),
        ),
      ),
    ),
  ),
),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                _greeting(),
                style:  TextStyle(
                  color: Theme.of(context).colorScheme.onSurfaceVariant,
                  fontSize: 12,
                  fontWeight: FontWeight.w500,
                ),
              ),
              Text(
                _titleCase(_firstName(user.fullName)),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style:  TextStyle(
                  color: Theme.of(context).colorScheme.onSurface,
                  fontSize: 19,
                  fontWeight: FontWeight.w800,
                  letterSpacing: -0.4,
                ),
              ),
            ],
          ),
        ),
        if (churchId != null)
          Container(
            decoration: BoxDecoration(
             color: Theme.of(context).colorScheme.surfaceContainerHighest,
              shape: BoxShape.circle,
            ),
            child: IconTheme(
              data:  IconThemeData(color: Theme.of(context).colorScheme.onSurface,),
              child: NotificationBellButton(
                churchId: churchId!,
                notificationService: notificationService,
              ),
            ),
          ),
      ],
    );
  }
}

class _EventStoryCard extends StatelessWidget {
  final Map<String, dynamic> event;
  final VoidCallback onTap;

  const _EventStoryCard({required this.event, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;
    final title = _firstValue(
      event,
      ['title', 'event_title', 'name'],
      'Church Event',
    );
    final rawDate = _firstValue(
      event,
      ['event_date', 'start_date', 'published_at', 'created_at'],
      '',
    );
    final location = _firstValue(event, ['location', 'venue', 'address'], '');
    final parsed = DateTime.tryParse(rawDate)?.toLocal();

    final monthStr = parsed != null
        ? DateFormat('MMM').format(parsed).toUpperCase()
        : 'SOON';
    final dayStr = parsed != null ? DateFormat('d').format(parsed) : '•';

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(18),
      child: Container(
        width: 235,
        padding: const EdgeInsets.all(13),
        decoration: BoxDecoration(
  color: colors.surface,
  borderRadius: BorderRadius.circular(18),
 border: Border.all(
  color: colors.brightness == Brightness.dark
      ? colors.outlineVariant
      : const Color.fromARGB(255, 161, 168, 247),
),
),
        child: Row(
          children: [
            // Date Pill Badge
            Container(
              width: 50,
              height: 64,
              decoration: BoxDecoration(
                gradient: AppColors.primaryGradient,
                borderRadius: BorderRadius.circular(13),
              ),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    monthStr,
                    style: const TextStyle(
                      color: Color(0xD9FFFFFF),
                      fontSize: 10,
                      fontWeight: FontWeight.w800,
                      letterSpacing: 0.6,
                    ),
                  ),
                  const SizedBox(height: 1),
                  Text(
                    dayStr,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 20,
                      fontWeight: FontWeight.w900,
                      height: 1.1,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    title,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style:  TextStyle(
                     color: Theme.of(context).colorScheme.onSurface,
                      fontSize: 14,
                      fontWeight: FontWeight.w800,
                      height: 1.25,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Row(
                    children: [
                      Icon(
                        location.isNotEmpty
                            ? Icons.location_on_rounded
                            : Icons.schedule_rounded,
                        size: 13,
                        color: AppColors.primary,
                      ),
                      const SizedBox(width: 4),
                      Expanded(
                        child: Text(
                          location.isNotEmpty
                              ? location
                              : (parsed != null
                                  ? DateFormat('h:mm a').format(parsed)
                                  : 'Upcoming'),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style:  TextStyle(
                            color: Theme.of(context).colorScheme.onSurfaceVariant,
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
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
      ),
    );
  }
}

// ============================================================================
// POSTS & EVENTS TABS
// ============================================================================

class _PostsTab extends StatelessWidget {
  final String? churchId;
  final PostService postService;

  const _PostsTab({required this.churchId, required this.postService});

  @override
  Widget build(BuildContext context) {
    if (churchId == null) {
      return const _CenteredEmpty(
        child: _EmptyMessage(
          icon: Icons.link_off_rounded,
          title: 'No active membership',
          message: 'No active church membership was found.',
        ),
      );
    }

    return _DataListPage(
      title: 'Explore Posts',
      subtitle: 'Messages, news, and inspiration from your church.',
      icon: Icons.explore_rounded,
      future: postService.getPublishedPosts(churchId!),
      type: 'post',
      churchId: churchId,
      postService: postService,
    );
  }
}

class _EventsTab extends StatelessWidget {
  final String? churchId;
  final EventService eventService;

  const _EventsTab({required this.churchId, required this.eventService});

  @override
  Widget build(BuildContext context) {
    if (churchId == null) {
      return const _CenteredEmpty(
        child: _EmptyMessage(
          icon: Icons.link_off_rounded,
          title: 'No active membership',
          message: 'No active church membership was found.',
        ),
      );
    }

    return _DataListPage(
      title: 'Church Events',
      subtitle: 'Discover what is happening in your church community.',
      icon: Icons.calendar_month_rounded,
      future: eventService.getPublishedEvents(churchId!),
      type: 'event',
    );
  }
}

class _PaymentsTab extends StatelessWidget {
  final String? churchId;
  final PaymentService paymentService;

  const _PaymentsTab({required this.churchId, required this.paymentService});

  @override
  Widget build(BuildContext context) {
    if (churchId == null) {
      return const _CenteredEmpty(
        child: _EmptyMessage(
          icon: Icons.link_off_rounded,
          title: 'No active membership',
          message: 'No active church membership was found.',
        ),
      );
    }

    return MemberPaymentsPage(
      churchId: churchId!,
      paymentService: paymentService,
    );
  }
}

// ============================================================================
// SOCIAL PROFILE TAB (Cover Header + Overlapping Avatar + Clean Cards)
// ============================================================================

class _ProfileTab extends StatelessWidget {
  final String? photoUrl;
  final bool uploadingPhoto;
  final VoidCallback? onChangePhoto;
  final UserModel user;
  final VoidCallback onLogout;
  final VoidCallback onChangePassword;

  const _ProfileTab({
    required this.user,
    required this.uploadingPhoto,
    required this.onLogout,
    required this.onChangePassword,
    required this.onChangePhoto,
    required this.photoUrl,
  });

  void _openSettings(BuildContext context) {
    final changePhoto = onChangePhoto;

    showModalBottomSheet<void>(
      context: context,
      useSafeArea: true,
      showDragHandle: true,
     
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (sheetContext) {
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Padding(
                  padding: EdgeInsets.symmetric(vertical: 4),
                  child: Text(
                    'Account Settings',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w800,
                     
                    ),
                  ),
                ),
                const SizedBox(height: 6),
                ValueListenableBuilder<bool>(
  valueListenable: darkModeEnabled,
  builder: (context, enabled, child) {
    final colors = Theme.of(context).colorScheme;

    return SwitchListTile(
      controlAffinity: ListTileControlAffinity.trailing,
      secondary: Container(
        padding: const EdgeInsets.all(8),
        decoration: BoxDecoration(
          color: colors.surfaceContainerHighest,
          borderRadius: BorderRadius.circular(10),
        ),
        child: Icon(
          Icons.dark_mode_outlined,
          color: colors.primary,
          size: 20,
        ),
      ),
      title: const Text(
        'Dark Mode',
        style: TextStyle(fontWeight: FontWeight.w600),
      ),
      value: enabled,
      onChanged: setDarkMode,
    );
  },
),
                ListTile(
                  leading: Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: Theme.of(context).colorScheme.surfaceContainerHighest,
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Icon(
                      Icons.photo_camera_outlined,
                      color: AppColors.primary,
                      size: 20,
                    ),
                  ),
                  title: Text(
                    uploadingPhoto
                        ? 'Uploading picture…'
                        : 'Change Profile Picture',
                    style: const TextStyle(fontWeight: FontWeight.w600),
                  ),
                  enabled: changePhoto != null && !uploadingPhoto,
                  onTap: changePhoto == null || uploadingPhoto
                      ? null
                      : () {
                          Navigator.of(sheetContext).pop();
                          changePhoto();
                        },
                ),
                 const Padding(
                  padding: EdgeInsets.symmetric(horizontal: 16),
                  child: Divider(),
                ),
                ListTile(
                  leading: Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                     color: Theme.of(context).colorScheme.surfaceContainerHighest,
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Icon(
                      Icons.lock_outline_rounded,
                      color: AppColors.primary,
                      size: 20,
                    ),
                  ),
                  title: const Text(
                    'Change Password',
                    style: TextStyle(fontWeight: FontWeight.w600),
                  ),
                  onTap: () {
                    Navigator.of(sheetContext).pop();
                    onChangePassword();
                  },
                ),
                const Padding(
                  padding: EdgeInsets.symmetric(horizontal: 16),
                  child: Divider(),
                ),
                ListTile(
                  leading: Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFEE2E2),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Icon(
                      Icons.logout_rounded,
                      color: Color(0xFFDC2626),
                      size: 20,
                    ),
                  ),
                  title: const Text(
                    'Sign Out',
                    style: TextStyle(
                      color: Color(0xFFDC2626),
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  onTap: () {
                    Navigator.of(sheetContext).pop();
                    onLogout();
                  },
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: EdgeInsets.zero,
      children: [
        // Cover Banner + Overlapping Avatar
        Stack(
          clipBehavior: Clip.none,
          alignment: Alignment.topCenter,
children: [
  const SizedBox(height: 201),
            Container(
              height: 155,
              width: double.infinity,
              decoration: const BoxDecoration(
                gradient: AppColors.primaryGradient,
              ),
              child: Stack(
                children: [
                  const Positioned(
                    right: -25,
                    top: -30,
                    child: _DecorativeOrb(size: 130, opacity: 0.12),
                  ),
                  const Positioned(
                    left: -20,
                    bottom: -40,
                    child: _DecorativeOrb(size: 100, opacity: 0.08),
                  ),
                  Positioned(
                    top: 12,
                    right: 16,
                    child: IconButton.filledTonal(
                      style: IconButton.styleFrom(
                        backgroundColor: Colors.white.withValues(alpha: 0.18),
                        foregroundColor: Colors.white,
                      ),
                      onPressed: () => _openSettings(context),
                      icon: const Icon(Icons.settings_outlined, size: 22),
                    ),
                  ),
                ],
              ),
            ),
            Positioned(
              bottom: 0,
              child: GestureDetector(
                onTap: photoUrl == null || photoUrl!.isEmpty
    ? null
    : () => _viewProfilePicture(context, photoUrl),
                child: Stack(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(4),
                      decoration: const BoxDecoration(
                        color: AppColors.background,
                        shape: BoxShape.circle,
                        boxShadow: [
                          BoxShadow(
                            color: Color(0x1A101828),
                            blurRadius: 16,
                            offset: Offset(0, 6),
                          ),
                        ],
                      ),
                      child: CircleAvatar(
                        radius: 44,
                        backgroundColor: const Color(0xFFE0E7FF),
                        foregroundImage:
                            photoUrl == null ? null : NetworkImage(photoUrl!),
                        onForegroundImageError:
                            photoUrl == null ? null : (_, _) {},
                        child: Text(
                          _initials(user.fullName.toUpperCase()),
                          style: const TextStyle(
                            color: AppColors.primary,
                            fontSize: 26,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                      ),
                    ),
                    if (onChangePhoto != null)
                      Positioned(
                        right: 2,
                        bottom: 2,
                        child: Container(
                          width: 30,
                          height: 30,
                          decoration: BoxDecoration(
                            color: AppColors.primary,
                            shape: BoxShape.circle,
                            border: Border.all(
                              color: AppColors.background,
                              width: 2.5,
                            ),
                          ),
                          child: uploadingPhoto
                              ? const Padding(
                                  padding: EdgeInsets.all(6),
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                    color: Colors.white,
                                  ),
                                )
                              :  IconButton(
    tooltip: 'Change profile picture',
    onPressed: onChangePhoto,
    padding: EdgeInsets.zero,
    icon: const Icon(
      Icons.camera_alt_rounded,
      color: Colors.white,
      size: 14,
    ),
  ),
                        ),
                      ),
                  ],
                ),
              ),
            ),
          ],
        ),

        const SizedBox(height: 10),

        // User Handle & Verified Status
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20),
          child: Column(
            children: [
              Text(
                _titleCase(user.fullName),
                textAlign: TextAlign.center,
                style:  TextStyle(
                  color: Theme.of(context).colorScheme.onSurface,
                  fontSize: 22,
                  fontWeight: FontWeight.w800,
                  letterSpacing: -0.3,
                ),
              ),
              const SizedBox(height: 6),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
                decoration: BoxDecoration(
                  color: AppColors.primary.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(
                      Icons.verified_rounded,
                      color: AppColors.primary,
                      size: 15,
                    ),
                    const SizedBox(width: 5),
                    Text(
                      '${_titleCase(user.accountStatus)} Member',
                      style: const TextStyle(
                        color: AppColors.primary,
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),

        const SizedBox(height: 24),

        // About / Contact Info Card
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
               Text(
                'About',
                style: TextStyle(
                  color: Theme.of(context).colorScheme.onSurface,
                  fontSize: 15,
                  fontWeight: FontWeight.w800,
                ),
              ),
              const SizedBox(height: 10),
              Container(
                decoration: BoxDecoration(
                 color: Theme.of(context).colorScheme.surface,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: AppColors.border),
                ),
                child: Column(
                  children: [
                    _ProfileInfoRow(
                      icon: Icons.person_outline_rounded,
                      label: 'Full name',
                      value: user.fullName,
                    ),
                    const Divider(height: 1, indent: 68),
                    _ProfileInfoRow(
                      icon: Icons.phone_outlined,
                      label: 'Phone',
                      value: user.phone,
                    ),
                    const Divider(height: 1, indent: 68),
                    _ProfileInfoRow(
                      icon: Icons.email_outlined,
                      label: 'Email',
                      value: user.email ?? 'Not provided',
                    ),
                    const Divider(height: 1, indent: 68),
                    _ProfileInfoRow(
                      icon: Icons.verified_user_outlined,
                      label: 'Account status',
                      value: _titleCase(user.accountStatus),
                      valueColor: user.accountStatus.toLowerCase() == 'active'
                          ? AppColors.success
                          : Theme.of(context).colorScheme.onSurfaceVariant,
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 18),
              SizedBox(
                width: double.infinity,
                child: OutlinedButton.icon(
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    backgroundColor: Theme.of(context).colorScheme.surface,
                    side: const BorderSide(color: AppColors.border),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16),
                    ),
                  ),
                  onPressed: () => _openSettings(context),
                  icon: const Icon(Icons.settings_outlined, size: 20),
                  label: const Text(
                    'Manage Account & Settings',
                    style: TextStyle(fontWeight: FontWeight.w700),
                  ),
                ),
              ),
              const SizedBox(height: 30),
            ],
          ),
        ),
      ],
    );
  }
}

class _DecorativeOrb extends StatelessWidget {
  final double size;
  final double opacity;

  const _DecorativeOrb({required this.size, this.opacity = 0.1});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: opacity),
        shape: BoxShape.circle,
      ),
    );
  }
}

class _ProfileInfoRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  final Color? valueColor;

  const _ProfileInfoRow({
    required this.icon,
    required this.label,
    required this.value,
    this.valueColor,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 13),
      child: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: Theme.of(context).colorScheme.surfaceContainerHighest,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(icon, color: AppColors.primary, size: 20),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style:  TextStyle(
                    color: Theme.of(context).colorScheme.onSurfaceVariant,
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  value,
                  style: TextStyle(
                    color: valueColor ?? Theme.of(context).colorScheme.onSurface,
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
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

// ============================================================================
// EXPLORE / LIST PAGE
// ============================================================================

class _DataListPage extends StatelessWidget {
  final String title;
  final String subtitle;
  final IconData icon;
  final Future<List> future;
  final String type;
  final String? churchId;
  final PostService? postService;

  const _DataListPage({
    required this.title,
    required this.subtitle,
    required this.icon,
    required this.future,
    required this.type,
    this.churchId,
    this.postService,
  });

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<List>(
      future: future,
      builder: (context, snapshot) {
        return ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 30),
          children: [
            _PageTitle(
              eyebrow: type == 'post' ? 'COMMUNITY STREAM' : 'GATHERINGS',
              title: title,
              subtitle: subtitle,
              icon: icon,
            ),
            const SizedBox(height: 18),
            if (snapshot.connectionState == ConnectionState.waiting)
              const _LoadingCards(count: 3)
            else if (snapshot.hasError)
              const _EmptyMessage(
                icon: Icons.cloud_off_outlined,
                title: 'Unable to load',
                message: 'Unable to load information. Please try again.',
              )
            else if ((snapshot.data ?? []).isEmpty)
              _EmptyMessage(
                icon: type == 'post'
                    ? Icons.article_outlined
                    : Icons.event_busy_outlined,
                title: type == 'post' ? 'No posts yet' : 'No events yet',
                message: 'Nothing has been published yet.',
              )
            else
              ...(snapshot.data ?? []).map(
                (item) => _ContentCard(
                  data: item,
                  type: type,
                  churchId: churchId,
                  postService: postService,
                ),
              ),
          ],
        );
      },
    );
  }
}

class _PageTitle extends StatelessWidget {
  final String eyebrow;
  final String title;
  final String subtitle;
  final IconData? icon;

  const _PageTitle({
    required this.eyebrow,
    required this.title,
    required this.subtitle,
    this.icon,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          if (icon != null) ...[
            Container(
              width: 46,
              height: 46,
              decoration: BoxDecoration(
                gradient: AppColors.primaryGradient,
                borderRadius: BorderRadius.circular(15),
                boxShadow: const [
                  BoxShadow(
                    color: Color(0x244F46E5),
                    blurRadius: 14,
                    offset: Offset(0, 6),
                  ),
                ],
              ),
              child: Icon(icon, color: Colors.white, size: 23),
            ),
            const SizedBox(width: 12),
          ],
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  eyebrow,
                  style: const TextStyle(
                    color: AppColors.primary,
                    fontSize: 10,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 1.1,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  title,
                  style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                        fontWeight: FontWeight.w800,
                        letterSpacing: -0.3,
                      ),
                ),
                const SizedBox(height: 2),
                Text(
                  subtitle,
                  style:  TextStyle(
                    color: Theme.of(context).colorScheme.onSurfaceVariant,
                    fontSize: 13,
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

// ============================================================================
// SOCIAL FEED CARD (Author Header + Media + Social Engagement Footer)
// ============================================================================

class _ContentCard extends StatefulWidget {
  final Map<String, dynamic> data;
  final String type;
  final String? churchId;
  final PostService? postService;

  const _ContentCard({
    required this.data,
    required this.type,
    this.churchId,
    this.postService,
  });

  @override
  State<_ContentCard> createState() => _ContentCardState();
}

class _ContentCardState extends State<_ContentCard> {
  @override
  Widget build(BuildContext context) {
    final data = widget.data;
    final type = widget.type;
    final churchId = widget.churchId;
    final postService = widget.postService;
    final isPost = type == 'post';

    final title = _firstValue(
      data,
      isPost
          ? ['title', 'post_title', 'name']
          : ['title', 'event_title', 'name'],
      isPost ? 'Church Post' : 'Church Event',
    );

    final description = _firstValue(data, [
      'content',
      'description',
      'body',
      'message',
    ], '');

    final rawDate = _firstValue(data, [
      'event_date',
      'start_date',
      'published_at',
      'created_at',
    ], '');
    final location = _firstValue(data, ['location', 'venue', 'address'], '');
    final postType = _firstValue(data, ['post_type', 'type'], '');
    final authorName = _firstValue(
      data,
      ['church_name', 'churchName', 'author_name', 'authorName'],
      'Church Community',
    );
    final postId = _firstValue(data, ['id', 'post_id', 'postId'], '');
    final canLike =
        isPost && postId.isNotEmpty && churchId != null && postService != null;

    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: AppColors.border.withValues(alpha: 0.85)),
        boxShadow: const [
          BoxShadow(
            color: Color(0x07101828),
            blurRadius: 16,
            offset: Offset(0, 6),
          ),
        ],
      ),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: isPost ? () => _openPostDetails(context) : null,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 1. Social Author Header
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 14, 16, 10),
              child: Row(
                children: [
                  Container(
                    width: 40,
                    height: 40,
                    decoration: BoxDecoration(
                      gradient: isPost
                          ? AppColors.primaryGradient
                          : const LinearGradient(
                              colors: [Color(0xFF0D9488), Color(0xFF14B8A6)],
                            ),
                      shape: BoxShape.circle,
                    ),
                    child: Icon(
                      isPost
                          ? Icons.church_rounded
                          : Icons.event_available_rounded,
                      color: Colors.white,
                      size: 19,
                    ),
                  ),
                  const SizedBox(width: 11),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Flexible(
                              child: Text(
                                authorName,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style:  TextStyle(
                                  color: Theme.of(context).colorScheme.onSurface,
                                  fontSize: 14,
                                  fontWeight: FontWeight.w800,
                                ),
                              ),
                            ),
                            const SizedBox(width: 4),
                            const Icon(
                              Icons.verified_rounded,
                              color: AppColors.primary,
                              size: 14,
                            ),
                          ],
                        ),
                        if (rawDate.isNotEmpty) ...[
                          const SizedBox(height: 1),
                          Text(
                            isPost
                                ? _timeAgo(rawDate)
                                : _formatDate(rawDate),
                            style: TextStyle(
                              color: Theme.of(context).colorScheme.onSurfaceVariant,
                              fontSize: 11.5,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                  _TypeBadge(
                    label: isPost
                        ? (postType.isNotEmpty ? postType.toUpperCase() : 'POST')
                        : 'EVENT',
                    isEvent: !isPost,
                  ),
                ],
              ),
            ),

            // 2. Post / Event Title & Caption
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style:  TextStyle(
                      color: Theme.of(context).colorScheme.onSurface,
                      fontWeight: FontWeight.w800,
                      fontSize: 16.5,
                      height: 1.3,
                      letterSpacing: -0.2,
                    ),
                  ),
                  if (description.isNotEmpty) ...[
                    const SizedBox(height: 6),
                    Text(
                      description,
                      maxLines: isPost ? 3 : null,
                      overflow: isPost ? TextOverflow.ellipsis : null,
                      style:  TextStyle(
                        color: Theme.of(context).colorScheme.onSurface,
                        fontSize: 14,
                        height: 1.5,
                      ),
                    ),
                  ],
                ],
              ),
            ),

            // 3. Location Pill (for Events)
            if (!isPost && (location.isNotEmpty || rawDate.isNotEmpty))
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
                child: Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 12,
                    vertical: 9,
                  ),
                  decoration: BoxDecoration(
                   color: Theme.of(context).colorScheme.surfaceContainerHighest,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Wrap(
                    spacing: 14,
                    runSpacing: 6,
                    children: [
                      if (rawDate.isNotEmpty)
                        _MetadataItem(
                          icon: Icons.schedule_rounded,
                          label: _formatDate(rawDate),
                        ),
                      if (location.isNotEmpty)
                        _MetadataItem(
                          icon: Icons.location_on_rounded,
                          label: location,
                        ),
                    ],
                  ),
                ),
              ),

            // 4. Media Gallery
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 12),
              child: ContentMediaGallery(
                media: data['media'],
                enableDownload: isPost,
              ),
            ),

            // 5. Social Engagement Footer (for Posts)
            if (isPost) ...[
              const SizedBox(height: 10),
              Divider(
                height: 1,
                color: AppColors.border.withValues(alpha: 0.7),
              ),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                child: Row(
                  children: [
                    if (canLike)
                      PostLikeButton(
                        churchId: churchId,
                        postId: postId,
                        postService: postService,
                        initiallyLiked: _boolValue(data, [
                          'liked_by_me',
                          'likedByMe',
                        ]),
                        initialLikeCount: _intValue(data, [
                          'like_count',
                          'likeCount',
                        ]),
                        onChanged: _applyLikeState,
                        showLabel: false,
                      ),
                    const Spacer(),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 6,
                      ),
                      decoration: BoxDecoration(
                        color: AppColors.primary.withValues(alpha: 0.08),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: const Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            'Read post',
                            style: TextStyle(
                              color: AppColors.primary,
                              fontSize: 12.5,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                          SizedBox(width: 4),
                          Icon(
                            Icons.arrow_forward_ios_rounded,
                            color: AppColors.primary,
                            size: 12,
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ] else
              const SizedBox(height: 16),
          ],
        ),
      ),
    );
  }

  Future<void> _openPostDetails(BuildContext context) async {
    await Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => PostDetailsScreen(
          post: widget.data,
          churchId: widget.churchId,
          postService: widget.postService,
        ),
      ),
    );

    if (mounted) setState(() {});
  }

  void _applyLikeState(PostLikeState state) {
    if (!mounted) return;

    setState(() {
      widget.data['liked_by_me'] = state.liked;
      widget.data['like_count'] = state.likeCount;
    });
  }
}

class _TypeBadge extends StatelessWidget {
  final String label;
  final bool isEvent;

  const _TypeBadge({required this.label, this.isEvent = false});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
      decoration: BoxDecoration(
        color: isEvent
            ? const Color(0xFFCCFBF1)
            : AppColors.primary.withValues(alpha: 0.09),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: isEvent ? const Color(0xFF0F766E) : AppColors.primary,
          fontSize: 10,
          fontWeight: FontWeight.w800,
          letterSpacing: 0.5,
        ),
      ),
    );
  }
}

class _MetadataItem extends StatelessWidget {
  final IconData icon;
  final String label;

  const _MetadataItem({required this.icon, required this.label});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 15, color: AppColors.primary),
        const SizedBox(width: 5),
        Flexible(
          child: Text(
            label,
            overflow: TextOverflow.ellipsis,
            style:  TextStyle(
              color: Theme.of(context).colorScheme.onSurface,
              fontSize: 12,
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
      ],
    );
  }
}

// ============================================================================
// LOADING & EMPTY STATES
// ============================================================================

class _LoadingCards extends StatelessWidget {
  final int count;

  const _LoadingCards({required this.count});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: List.generate(
        count,
        (index) => Container(
          margin: const EdgeInsets.only(bottom: 14),
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Theme.of(context).colorScheme.surface,
            borderRadius: BorderRadius.circular(22),
            border: Border.all(color: AppColors.border),
          ),
          child: const Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  _Placeholder(width: 40, height: 40, radius: 20),
                  SizedBox(width: 12),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      _Placeholder(width: 120, height: 12),
                      SizedBox(height: 6),
                      _Placeholder(width: 70, height: 10),
                    ],
                  ),
                ],
              ),
              SizedBox(height: 14),
              _Placeholder(width: double.infinity, height: 15),
              SizedBox(height: 8),
              _Placeholder(width: 220, height: 12),
              SizedBox(height: 14),
              _Placeholder(width: double.infinity, height: 110, radius: 14),
            ],
          ),
        ),
      ),
    );
  }
}

class _Placeholder extends StatelessWidget {
  final double width;
  final double height;
  final double radius;

  const _Placeholder({
    required this.width,
    required this.height,
    this.radius = 6,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: width,
      height: height,
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(radius),
      ),
    );
  }
}

class _CenteredEmpty extends StatelessWidget {
  final Widget child;

  const _CenteredEmpty({required this.child});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(padding: const EdgeInsets.all(20), child: child),
    );
  }
}

class _EmptyMessage extends StatelessWidget {
  final IconData icon;
  final String title;
  final String message;

  const _EmptyMessage({
    required this.icon,
    required this.title,
    required this.message,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: Theme.of(context).colorScheme.outline),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 56,
            height: 56,
            decoration:  BoxDecoration(
              color: Theme.of(context).colorScheme.surfaceContainerHighest,
              shape: BoxShape.circle,
            ),
            child: Icon(icon, color: Theme.of(context).colorScheme.primary, size: 26),
          ),
          const SizedBox(height: 14),
          Text(
            title,
            textAlign: TextAlign.center,
            style:  TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w800,
              color: Theme.of(context).colorScheme.onSurface,
            ),
          ),
          const SizedBox(height: 5),
          Text(
            message,
            textAlign: TextAlign.center,
            style:  TextStyle(
              color: Theme.of(context).colorScheme.onSurfaceVariant,
              fontSize: 13,
              height: 1.4,
            ),
          ),
        ],
      ),
    );
  }
}

// ============================================================================
// HELPERS
// ============================================================================

String _firstValue(
  Map<String, dynamic> data,
  List<String> keys,
  String fallback,
) {
  for (final key in keys) {
    final value = data[key];
    if (value != null && value.toString().trim().isNotEmpty) {
      return value.toString();
    }
  }
  return fallback;
}

bool _boolValue(Map<String, dynamic> data, List<String> keys) {
  for (final key in keys) {
    final value = data[key];
    if (value is bool) return value;
    if (value != null) return value.toString().toLowerCase() == 'true';
  }

  return false;
}

int _intValue(Map<String, dynamic> data, List<String> keys) {
  for (final key in keys) {
    final value = data[key];
    if (value is num) return value.toInt();
    final parsed = int.tryParse(value?.toString() ?? '');
    if (parsed != null) return parsed;
  }

  return 0;
}

String _formatDate(String value) {
  final parsed = DateTime.tryParse(value);
  if (parsed == null) return value;

  return DateFormat('EEE, MMM d • h:mm a').format(parsed.toLocal());
}

String _timeAgo(String value) {
  final parsed = DateTime.tryParse(value)?.toLocal();
  if (parsed == null) return value;

  final diff = DateTime.now().difference(parsed);
  if (diff.inSeconds < 60) return 'Just now';
  if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
  if (diff.inHours < 24) return '${diff.inHours}h ago';
  if (diff.inDays < 7) return '${diff.inDays}d ago';
  return DateFormat('MMM d, y').format(parsed);
}

String _firstName(String fullName) {
  final parts = fullName.trim().split(RegExp(r'\s+'));
  return parts.isEmpty || parts.first.isEmpty ? 'Friend' : parts.first;
}

String _initials(String fullName) {
  final parts = fullName
      .trim()
      .split(RegExp(r'\s+'))
      .where((part) => part.isNotEmpty)
      .toList();

  if (parts.isEmpty) return 'CM';
  if (parts.length == 1) {
    return parts.first.substring(0, 1).toUpperCase();
  }

  return '${parts.first[0]}${parts.last[0]}'.toUpperCase();
}

String _titleCase(String value) {
  if (value.trim().isEmpty) return value;

  return value
      .replaceAll('_', ' ')
      .split(' ')
      .where((word) => word.isNotEmpty)
      .map(
        (word) => '${word[0].toUpperCase()}${word.substring(1).toLowerCase()}',
      )
      .join(' ');
}

String _greeting() {
  final hour = DateTime.now().hour;
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}
void _viewProfilePicture(BuildContext context, String? url) {
  if (url == null || url.isEmpty) return;

  showDialog<void>(
    context: context,
    barrierColor: const Color(0xF0090D16),
    builder: (dialogContext) {
      return Dialog(
        backgroundColor: Colors.transparent,
        insetPadding: EdgeInsets.zero,
        child: SafeArea(
          child: Stack(
            children: [
              // Tap outside image area to close
              Positioned.fill(
                child: GestureDetector(
                  onTap: () => Navigator.of(dialogContext).pop(),
                  behavior: HitTestBehavior.opaque,
                  child: const SizedBox.expand(),
                ),
              ),

              // Centered Pinch-to-Zoom Photo Stage
              Center(
                child: Padding(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 72,
                  ),
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(24),
                    child: Container(
                      constraints: const BoxConstraints(
                        maxWidth: 460,
                        maxHeight: 460,
                      ),
                      color: const Color(0xFF111827),
                      child: InteractiveViewer(
                        minScale: 1,
                        maxScale: 4,
                        child: Image.network(
                          url,
                          fit: BoxFit.contain,
                          loadingBuilder: (context, child, progress) {
                            if (progress == null) return child;
                            return const SizedBox(
                              width: 280,
                              height: 280,
                              child: Center(
                                child: CircularProgressIndicator(
                                  color: Colors.white,
                                  strokeWidth: 2.5,
                                ),
                              ),
                            );
                          },
                          errorBuilder: (_, _, _) => const SizedBox(
                            width: 300,
                            height: 260,
                            child: Center(
                              child: Padding(
                                padding: EdgeInsets.all(20),
                                child: Column(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Icon(
                                      Icons.broken_image_outlined,
                                      color: Colors.white54,
                                      size: 36,
                                    ),
                                    SizedBox(height: 10),
                                    Text(
                                      'Could not load the profile picture.',
                                      textAlign: TextAlign.center,
                                      style: TextStyle(
                                        color: Colors.white70,
                                        fontSize: 13.5,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              ),

              // Top Lightbox Header Bar
              Positioned(
                top: 10,
                left: 16,
                right: 16,
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 14,
                        vertical: 8,
                      ),
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: Colors.white12),
                      ),
                      child: const Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            Icons.account_circle_outlined,
                            color: Colors.white,
                            size: 17,
                          ),
                          SizedBox(width: 7),
                          Text(
                            'Profile Picture',
                            style: TextStyle(
                              color: Colors.white,
                              fontSize: 13.5,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const Spacer(),
                    IconButton(
                      tooltip: 'Close',
                      style: IconButton.styleFrom(
                        backgroundColor: Colors.white.withValues(alpha: 0.14),
                        foregroundColor: Colors.white,
                      ),
                      onPressed: () => Navigator.of(dialogContext).pop(),
                      icon: const Icon(Icons.close_rounded, size: 22),
                    ),
                  ],
                ),
              ),

              // Bottom Pinch-to-Zoom Hint Pill
              Positioned(
                bottom: 20,
                left: 0,
                right: 0,
                child: Center(
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 14,
                      vertical: 7,
                    ),
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: Colors.white12),
                    ),
                    child: const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          Icons.pinch_rounded,
                          color: Colors.white70,
                          size: 15,
                        ),
                        SizedBox(width: 6),
                        Text(
                          'Pinch to zoom • Tap outside to close',
                          style: TextStyle(
                            color: Colors.white70,
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      );
    },
  );
}