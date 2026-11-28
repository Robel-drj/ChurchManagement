import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

final darkModeEnabled = ValueNotifier<bool>(false);

Future<void> loadThemeSetting() async {
  final preferences = await SharedPreferences.getInstance();
  darkModeEnabled.value = preferences.getBool('dark_mode') ?? false;
}

Future<void> setDarkMode(bool enabled) async {
  darkModeEnabled.value = enabled;
  final preferences = await SharedPreferences.getInstance();
  await preferences.setBool('dark_mode', enabled);
}