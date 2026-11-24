import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../core/theme/app_colors.dart';
import '../../widgets/content_media_gallery.dart';

class PostDetailsScreen extends StatelessWidget {
  final Map<String, dynamic> post;

  const PostDetailsScreen({super.key, required this.post});

  @override
  Widget build(BuildContext context) {
    final title = _firstPostValue(post, const [
      'title',
      'post_title',
      'name',
    ], 'Church Post');
    final content = _firstPostValue(post, const [
      'content',
      'description',
      'body',
      'message',
    ], '');
    final postType = _firstPostValue(post, const ['post_type', 'type'], 'Post');
    final publishedAt = _firstPostValue(post, const [
      'published_at',
      'created_at',
    ], '');
    final creator = _firstPostValue(post, const [
      'creator_name',
      'author_name',
      'created_by_name',
    ], '');
    final media = post['media'];
    final hasMedia = media is List && media.isNotEmpty;
    final hasImage = _containsImage(media);
    final screenHeight = MediaQuery.sizeOf(context).height;
    final galleryHeight = (screenHeight * 0.48).clamp(300.0, 520.0);

    return Scaffold(
      appBar: AppBar(title: const Text('Post details')),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(20, 8, 20, 36),
        children: [
          Container(
            padding: const EdgeInsets.all(22),
            decoration: BoxDecoration(
              gradient: AppColors.primaryGradient,
              borderRadius: BorderRadius.circular(24),
              boxShadow: const [
                BoxShadow(
                  color: Color(0x294F46E5),
                  blurRadius: 22,
                  offset: Offset(0, 9),
                ),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _PostTypeBadge(label: _titleCase(postType)),
                const SizedBox(height: 16),
                Text(
                  title,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 26,
                    height: 1.2,
                    fontWeight: FontWeight.w800,
                    letterSpacing: -0.5,
                  ),
                ),
                if (publishedAt.isNotEmpty || creator.isNotEmpty) ...[
                  const SizedBox(height: 17),
                  Wrap(
                    spacing: 16,
                    runSpacing: 9,
                    children: [
                      if (publishedAt.isNotEmpty)
                        _HeaderMetadata(
                          icon: Icons.schedule_rounded,
                          label: _formatPostDate(publishedAt),
                        ),
                      if (creator.isNotEmpty)
                        _HeaderMetadata(
                          icon: Icons.person_outline_rounded,
                          label: creator,
                        ),
                    ],
                  ),
                ],
              ],
            ),
          ),
          if (hasMedia) ...[
            const SizedBox(height: 8),
            ContentMediaGallery(
              media: media,
              height: galleryHeight,
              imageFit: BoxFit.contain,
              imageBackgroundColor: const Color(0xFF111827),
              enableFullScreenImage: true,
              enableDownload: true,
            ),
            if (hasImage) ...[
              const SizedBox(height: 9),
              const Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    Icons.pinch_rounded,
                    size: 15,
                    color: AppColors.textSecondary,
                  ),
                  SizedBox(width: 6),
                  Text(
                    'Tap the image to view and zoom',
                    style: TextStyle(
                      color: AppColors.textSecondary,
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
            ],
          ],
          const SizedBox(height: 22),
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: AppColors.border),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Row(
                  children: [
                    Icon(
                      Icons.notes_rounded,
                      color: AppColors.primary,
                      size: 20,
                    ),
                    SizedBox(width: 9),
                    Text(
                      'Message',
                      style: TextStyle(
                        color: AppColors.textPrimary,
                        fontSize: 16,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 14),
                const Divider(),
                const SizedBox(height: 14),
                Text(
                  content.isEmpty
                      ? 'No additional message was provided.'
                      : content,
                  style: TextStyle(
                    color: content.isEmpty
                        ? AppColors.textSecondary
                        : AppColors.textPrimary,
                    fontSize: 15,
                    height: 1.65,
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

class _PostTypeBadge extends StatelessWidget {
  final String label;

  const _PostTypeBadge({required this.label});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.16),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.white24),
      ),
      child: Text(
        label.toUpperCase(),
        style: const TextStyle(
          color: Colors.white,
          fontSize: 10,
          fontWeight: FontWeight.w800,
          letterSpacing: 0.9,
        ),
      ),
    );
  }
}

class _HeaderMetadata extends StatelessWidget {
  final IconData icon;
  final String label;

  const _HeaderMetadata({required this.icon, required this.label});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, color: Colors.white70, size: 16),
        const SizedBox(width: 6),
        Text(
          label,
          style: const TextStyle(
            color: Colors.white,
            fontSize: 12,
            fontWeight: FontWeight.w600,
          ),
        ),
      ],
    );
  }
}

String _firstPostValue(
  Map<String, dynamic> data,
  List<String> keys,
  String fallback,
) {
  for (final key in keys) {
    final value = data[key];
    if (value != null && value.toString().trim().isNotEmpty) {
      return value.toString().trim();
    }
  }

  return fallback;
}

String _formatPostDate(String value) {
  final parsed = DateTime.tryParse(value);
  if (parsed == null) return value;

  return DateFormat('MMMM d, y • h:mm a').format(parsed.toLocal());
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

bool _containsImage(Object? media) {
  if (media is! List) return false;

  return media.any((entry) {
    if (entry is! Map) return false;
    final type = (entry['media_type'] ?? entry['mediaType'] ?? entry['type'])
        ?.toString()
        .toLowerCase();
    return type == 'image';
  });
}
