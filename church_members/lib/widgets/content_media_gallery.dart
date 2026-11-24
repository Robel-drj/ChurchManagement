import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:video_player/video_player.dart';

import '../core/theme/app_colors.dart';
import '../services/media_download_service.dart';

class ContentMediaGallery extends StatefulWidget {
  final Object? media;
  final double height;
  final BoxFit imageFit;
  final Alignment imageAlignment;
  final Color imageBackgroundColor;
  final bool enableFullScreenImage;
  final bool enableDownload;

  const ContentMediaGallery({
    super.key,
    required this.media,
    this.height = 220,
    this.imageFit = BoxFit.cover,
    this.imageAlignment = Alignment.center,
    this.imageBackgroundColor = AppColors.surfaceMuted,
    this.enableFullScreenImage = false,
    this.enableDownload = false,
  });

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
            height: widget.height,
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
                    enableDownload: widget.enableDownload,
                    fileName: item.fileName,
                    mimeType: item.mimeType,
                  );
                }

                return _NetworkImage(
                  url: item.url,
                  fit: widget.imageFit,
                  alignment: widget.imageAlignment,
                  backgroundColor: widget.imageBackgroundColor,
                  enableFullScreen: widget.enableFullScreenImage,
                  enableDownload: widget.enableDownload,
                  fileName: item.fileName,
                  mimeType: item.mimeType,
                );
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
  final BoxFit fit;
  final Alignment alignment;
  final Color backgroundColor;
  final bool enableFullScreen;
  final bool enableDownload;
  final String? fileName;
  final String? mimeType;

  const _NetworkImage({
    required this.url,
    required this.fit,
    required this.alignment,
    required this.backgroundColor,
    required this.enableFullScreen,
    required this.enableDownload,
    required this.fileName,
    required this.mimeType,
  });

  @override
  Widget build(BuildContext context) {
    final darkBackground =
        ThemeData.estimateBrightnessForColor(backgroundColor) ==
        Brightness.dark;

    return ClipRRect(
      borderRadius: BorderRadius.circular(12),
      child: ColoredBox(
        color: backgroundColor,
        child: Stack(
          fit: StackFit.expand,
          children: [
            CachedNetworkImage(
              imageUrl: url,
              width: double.infinity,
              height: double.infinity,
              fit: fit,
              alignment: alignment,
              placeholder: (context, url) => _MediaStatus(
                dark: darkBackground,
                child: CircularProgressIndicator(
                  color: darkBackground ? Colors.white : AppColors.primary,
                ),
              ),
              errorWidget: (context, url, error) => _MediaStatus(
                dark: darkBackground,
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      Icons.broken_image_outlined,
                      color: darkBackground
                          ? Colors.white70
                          : AppColors.textSecondary,
                    ),
                    const SizedBox(height: 6),
                    const Text('Image unavailable'),
                  ],
                ),
              ),
            ),
            if (enableFullScreen) ...[
              Positioned.fill(
                child: Semantics(
                  button: true,
                  label: 'View full image',
                  child: Material(
                    color: Colors.transparent,
                    child: InkWell(onTap: () => _openFullScreenImage(context)),
                  ),
                ),
              ),
              Positioned(
                right: 10,
                bottom: 10,
                child: IgnorePointer(
                  child: Container(
                    width: 38,
                    height: 38,
                    decoration: BoxDecoration(
                      color: Colors.black.withValues(alpha: 0.62),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Icon(
                      Icons.open_in_full_rounded,
                      color: Colors.white,
                      size: 18,
                    ),
                  ),
                ),
              ),
            ],
            if (enableDownload)
              Positioned(
                top: 10,
                right: 10,
                child: _MediaDownloadButton(
                  url: url,
                  type: DownloadMediaType.image,
                  fileName: fileName,
                  mimeType: mimeType,
                ),
              ),
          ],
        ),
      ),
    );
  }

  void _openFullScreenImage(BuildContext context) {
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => _FullScreenImageViewer(
          url: url,
          enableDownload: enableDownload,
          fileName: fileName,
          mimeType: mimeType,
        ),
      ),
    );
  }
}

class _FullScreenImageViewer extends StatelessWidget {
  final String url;
  final bool enableDownload;
  final String? fileName;
  final String? mimeType;

  const _FullScreenImageViewer({
    required this.url,
    required this.enableDownload,
    required this.fileName,
    required this.mimeType,
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.black,
        foregroundColor: Colors.white,
        surfaceTintColor: Colors.transparent,
        titleTextStyle: const TextStyle(
          color: Colors.white,
          fontSize: 18,
          fontWeight: FontWeight.w700,
        ),
        title: const Text('Photo'),
        actions: [
          if (enableDownload)
            Padding(
              padding: const EdgeInsets.only(right: 8),
              child: Center(
                child: _MediaDownloadButton(
                  url: url,
                  type: DownloadMediaType.image,
                  fileName: fileName,
                  mimeType: mimeType,
                ),
              ),
            ),
        ],
      ),
      body: SafeArea(
        top: false,
        child: InteractiveViewer(
          minScale: 0.8,
          maxScale: 5,
          child: SizedBox.expand(
            child: CachedNetworkImage(
              imageUrl: url,
              fit: BoxFit.contain,
              placeholder: (context, url) => const _MediaStatus(
                dark: true,
                child: CircularProgressIndicator(color: Colors.white),
              ),
              errorWidget: (context, url, error) => const _MediaStatus(
                dark: true,
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.broken_image_outlined, color: Colors.white70),
                    SizedBox(height: 6),
                    Text('Image unavailable'),
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

class _MediaDownloadButton extends StatefulWidget {
  final String url;
  final DownloadMediaType type;
  final String? fileName;
  final String? mimeType;

  const _MediaDownloadButton({
    required this.url,
    required this.type,
    required this.fileName,
    required this.mimeType,
  });

  @override
  State<_MediaDownloadButton> createState() => _MediaDownloadButtonState();
}

class _MediaDownloadButtonState extends State<_MediaDownloadButton> {
  static const _downloadService = MediaDownloadService();

  bool _downloading = false;
  double? _progress;

  String get _mediaLabel =>
      widget.type == DownloadMediaType.video ? 'video' : 'photo';

  Future<void> _download() async {
    if (_downloading) return;

    setState(() {
      _downloading = true;
      _progress = null;
    });

    try {
      final message = await _downloadService.download(
        url: widget.url,
        type: widget.type,
        suggestedFileName: widget.fileName,
        mimeType: widget.mimeType,
        onProgress: (progress) {
          if (!mounted) return;
          final nextProgress = progress?.clamp(0.0, 1.0);
          if (nextProgress == _progress) return;
          setState(() => _progress = nextProgress);
        },
      );

      if (!mounted) return;
      _showMessage(message, success: true);
    } on MediaDownloadException catch (error) {
      if (!mounted) return;
      _showMessage(error.message, success: false);
    } catch (_) {
      if (!mounted) return;
      _showMessage(
        'The $_mediaLabel could not be saved. Please try again.',
        success: false,
      );
    } finally {
      if (mounted) {
        setState(() {
          _downloading = false;
          _progress = null;
        });
      }
    }
  }

  void _showMessage(String message, {required bool success}) {
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(
        SnackBar(
          content: Row(
            children: [
              Icon(
                success ? Icons.check_circle_rounded : Icons.error_outline,
                color: Colors.white,
                size: 20,
              ),
              const SizedBox(width: 10),
              Expanded(child: Text(message)),
            ],
          ),
        ),
      );
  }

  @override
  Widget build(BuildContext context) {
    final label = _downloading
        ? 'Downloading $_mediaLabel'
        : 'Download $_mediaLabel';

    return Tooltip(
      message: label,
      child: Semantics(
        button: true,
        label: label,
        child: Material(
          key: ValueKey('download-${widget.type.name}-${widget.url}'),
          color: Colors.black.withValues(alpha: 0.68),
          borderRadius: BorderRadius.circular(12),
          child: InkWell(
            onTap: _downloading ? null : _download,
            borderRadius: BorderRadius.circular(12),
            child: SizedBox(
              width: 40,
              height: 40,
              child: _downloading
                  ? Padding(
                      padding: const EdgeInsets.all(10),
                      child: CircularProgressIndicator(
                        value: _progress,
                        color: Colors.white,
                        strokeWidth: 2.4,
                      ),
                    )
                  : const Icon(
                      Icons.download_rounded,
                      color: Colors.white,
                      size: 21,
                    ),
            ),
          ),
        ),
      ),
    );
  }
}

class _NetworkVideoPlayer extends StatefulWidget {
  final String url;
  final bool active;
  final bool enableDownload;
  final String? fileName;
  final String? mimeType;

  const _NetworkVideoPlayer({
    super.key,
    required this.url,
    required this.active,
    required this.enableDownload,
    required this.fileName,
    required this.mimeType,
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
      return _withDownloadButton(
        const ClipRRect(
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
        ),
      );
    }

    if (!_initialized) {
      return _withDownloadButton(
        const ClipRRect(
          borderRadius: BorderRadius.all(Radius.circular(12)),
          child: _MediaStatus(
            dark: true,
            child: CircularProgressIndicator(color: Colors.white),
          ),
        ),
      );
    }

    final aspectRatio = _controller.value.aspectRatio > 0
        ? _controller.value.aspectRatio
        : 16 / 9;

    return _withDownloadButton(
      ClipRRect(
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
      ),
    );
  }

  Widget _withDownloadButton(Widget child) {
    if (!widget.enableDownload) return child;

    return Stack(
      fit: StackFit.expand,
      children: [
        child,
        Positioned(
          top: 10,
          right: 10,
          child: _MediaDownloadButton(
            url: widget.url,
            type: DownloadMediaType.video,
            fileName: widget.fileName,
            mimeType: widget.mimeType,
          ),
        ),
      ],
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
  final String? fileName;
  final String? mimeType;

  const _ContentMediaItem({
    required this.type,
    required this.url,
    required this.fileName,
    required this.mimeType,
  });
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
    final rawFileName = (entry['file_name'] ?? entry['fileName'])
        ?.toString()
        .trim();
    final rawMimeType = (entry['mime_type'] ?? entry['mimeType'])
        ?.toString()
        .trim();
    final fileName = rawFileName == null || rawFileName.isEmpty
        ? null
        : rawFileName;
    final mimeType = rawMimeType == null || rawMimeType.isEmpty
        ? null
        : rawMimeType;
    final uri = url == null ? null : Uri.tryParse(url);

    if (url == null ||
        url.isEmpty ||
        uri == null ||
        !uri.hasScheme ||
        (uri.scheme != 'http' && uri.scheme != 'https')) {
      continue;
    }

    if (type == 'video') {
      items.add(
        _ContentMediaItem(
          type: _ContentMediaType.video,
          url: url,
          fileName: fileName,
          mimeType: mimeType,
        ),
      );
    } else if (type == 'image') {
      items.add(
        _ContentMediaItem(
          type: _ContentMediaType.image,
          url: url,
          fileName: fileName,
          mimeType: mimeType,
        ),
      );
    }
  }

  return items;
}
