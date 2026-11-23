import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:video_player/video_player.dart';

import '../core/theme/app_colors.dart';

class ContentMediaGallery extends StatefulWidget {
  final Object? media;

  const ContentMediaGallery({super.key, required this.media});

  @override
  State<ContentMediaGallery> createState() => _ContentMediaGalleryState();
}

class _ContentMediaGalleryState extends State<ContentMediaGallery> {
  late List<_ContentMediaItem> _items;
  int _currentPage = 0;

  @override
  void initState() {
    super.initState();
    _items = _parseMedia(widget.media);
  }

  @override
  void didUpdateWidget(covariant ContentMediaGallery oldWidget) {
    super.didUpdateWidget(oldWidget);
    _items = _parseMedia(widget.media);

    if (_items.isEmpty) {
      _currentPage = 0;
    } else if (_currentPage >= _items.length) {
      _currentPage = _items.length - 1;
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_items.isEmpty) return const SizedBox.shrink();

    return Padding(
      padding: const EdgeInsets.only(top: 12),
      child: Column(
        children: [
          SizedBox(
            height: 220,
            child: PageView.builder(
              itemCount: _items.length,
              onPageChanged: (page) => setState(() => _currentPage = page),
              itemBuilder: (context, index) {
                final item = _items[index];

                if (item.type == _ContentMediaType.video) {
                  return _NetworkVideoPlayer(
                    key: ValueKey('video-$index-${item.url}'),
                    url: item.url,
                    active: index == _currentPage,
                  );
                }

                return _NetworkImage(url: item.url);
              },
            ),
          ),
          if (_items.length > 1) ...[
            const SizedBox(height: 8),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                for (var index = 0; index < _items.length; index++)
                  AnimatedContainer(
                    duration: const Duration(milliseconds: 180),
                    width: index == _currentPage ? 18 : 7,
                    height: 7,
                    margin: const EdgeInsets.symmetric(horizontal: 3),
                    decoration: BoxDecoration(
                      color: index == _currentPage
                          ? AppColors.primary
                          : AppColors.border,
                      borderRadius: BorderRadius.circular(10),
                    ),
                  ),
              ],
            ),
          ],
        ],
      ),
    );
  }
}

class _NetworkImage extends StatelessWidget {
  final String url;

  const _NetworkImage({required this.url});

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(12),
      child: CachedNetworkImage(
        imageUrl: url,
        width: double.infinity,
        height: double.infinity,
        fit: BoxFit.cover,
        placeholder: (context, url) =>
            const _MediaStatus(child: CircularProgressIndicator()),
        errorWidget: (context, url, error) => const _MediaStatus(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.broken_image_outlined, color: AppColors.textSecondary),
              SizedBox(height: 6),
              Text('Image unavailable'),
            ],
          ),
        ),
      ),
    );
  }
}

class _NetworkVideoPlayer extends StatefulWidget {
  final String url;
  final bool active;

  const _NetworkVideoPlayer({
    super.key,
    required this.url,
    required this.active,
  });

  @override
  State<_NetworkVideoPlayer> createState() => _NetworkVideoPlayerState();
}

class _NetworkVideoPlayerState extends State<_NetworkVideoPlayer>
    with WidgetsBindingObserver {
  late final VideoPlayerController _controller;
  bool _initialized = false;
  bool _hasError = false;
  bool _isPlaying = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _controller = VideoPlayerController.networkUrl(Uri.parse(widget.url));
    _controller.addListener(_handleVideoState);
    _initialize();
  }

  Future<void> _initialize() async {
    try {
      await _controller.initialize();
      await _controller.setLooping(false);

      if (mounted) {
        setState(() => _initialized = true);
      }
    } catch (_) {
      if (mounted) {
        setState(() => _hasError = true);
      }
    }
  }

  void _handleVideoState() {
    if (!mounted) return;

    final hasError = _controller.value.hasError;
    final isPlaying = _controller.value.isPlaying;

    if (hasError != _hasError || isPlaying != _isPlaying) {
      setState(() {
        _hasError = hasError;
        _isPlaying = isPlaying;
      });
    }
  }

  Future<void> _togglePlayback() async {
    if (!_initialized || _hasError) return;

    if (_controller.value.isPlaying) {
      await _controller.pause();
    } else {
      if (_controller.value.position >= _controller.value.duration) {
        await _controller.seekTo(Duration.zero);
      }
      await _controller.play();
    }
  }

  @override
  void didUpdateWidget(covariant _NetworkVideoPlayer oldWidget) {
    super.didUpdateWidget(oldWidget);

    if (oldWidget.active && !widget.active && _controller.value.isPlaying) {
      _controller.pause();
    }
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state != AppLifecycleState.resumed && _controller.value.isPlaying) {
      _controller.pause();
    }
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _controller.removeListener(_handleVideoState);
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (_hasError) {
      return const ClipRRect(
        borderRadius: BorderRadius.all(Radius.circular(12)),
        child: _MediaStatus(
          dark: true,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.videocam_off_outlined, color: Colors.white70),
              SizedBox(height: 6),
              Text('Video unavailable'),
            ],
          ),
        ),
      );
    }

    if (!_initialized) {
      return const ClipRRect(
        borderRadius: BorderRadius.all(Radius.circular(12)),
        child: _MediaStatus(
          dark: true,
          child: CircularProgressIndicator(color: Colors.white),
        ),
      );
    }

    final aspectRatio = _controller.value.aspectRatio > 0
        ? _controller.value.aspectRatio
        : 16 / 9;

    return ClipRRect(
      borderRadius: BorderRadius.circular(12),
      child: ColoredBox(
        color: Colors.black,
        child: Stack(
          fit: StackFit.expand,
          children: [
            Center(
              child: AspectRatio(
                aspectRatio: aspectRatio,
                child: VideoPlayer(_controller),
              ),
            ),
            Material(
              color: Colors.transparent,
              child: InkWell(
                onTap: _togglePlayback,
                child: Center(
                  child: AnimatedOpacity(
                    opacity: _isPlaying ? 0 : 1,
                    duration: const Duration(milliseconds: 180),
                    child: Container(
                      width: 58,
                      height: 58,
                      decoration: const BoxDecoration(
                        color: Colors.black54,
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(
                        Icons.play_arrow_rounded,
                        color: Colors.white,
                        size: 38,
                      ),
                    ),
                  ),
                ),
              ),
            ),
            Positioned(
              left: 10,
              right: 10,
              bottom: 8,
              child: VideoProgressIndicator(
                _controller,
                allowScrubbing: true,
                colors: const VideoProgressColors(
                  playedColor: AppColors.primary,
                  bufferedColor: Colors.white38,
                  backgroundColor: Colors.white24,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _MediaStatus extends StatelessWidget {
  final Widget child;
  final bool dark;

  const _MediaStatus({required this.child, this.dark = false});

  @override
  Widget build(BuildContext context) {
    return ColoredBox(
      color: dark ? Colors.black : AppColors.background,
      child: Center(
        child: DefaultTextStyle.merge(
          style: TextStyle(
            color: dark ? Colors.white70 : AppColors.textSecondary,
            fontSize: 13,
          ),
          child: child,
        ),
      ),
    );
  }
}

enum _ContentMediaType { image, video }

class _ContentMediaItem {
  final _ContentMediaType type;
  final String url;

  const _ContentMediaItem({required this.type, required this.url});
}

List<_ContentMediaItem> _parseMedia(Object? value) {
  if (value is! List) return const [];

  final items = <_ContentMediaItem>[];

  for (final entry in value) {
    if (entry is! Map) continue;

    final url = (entry['media_url'] ?? entry['mediaUrl'] ?? entry['url'])
        ?.toString()
        .trim();
    final type = (entry['media_type'] ?? entry['mediaType'] ?? entry['type'])
        ?.toString()
        .trim()
        .toLowerCase();
    final uri = url == null ? null : Uri.tryParse(url);

    if (url == null ||
        url.isEmpty ||
        uri == null ||
        !uri.hasScheme ||
        (uri.scheme != 'http' && uri.scheme != 'https')) {
      continue;
    }

    if (type == 'video') {
      items.add(_ContentMediaItem(type: _ContentMediaType.video, url: url));
    } else if (type == 'image') {
      items.add(_ContentMediaItem(type: _ContentMediaType.image, url: url));
    }
  }

  return items;
}
