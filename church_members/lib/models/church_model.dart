class ChurchModel {
  final String id;
  final String name;
  final String code;
  final String? address;
  final String? logoUrl;
  final String status;

  ChurchModel({
    required this.id,
    required this.name,
    required this.code,
    this.address,
    this.logoUrl,
    required this.status,
  });

  factory ChurchModel.fromJson(Map<String, dynamic> json) {
    return ChurchModel(
      id: json['id']?.toString() ?? '',
      name: json['church_name']?.toString() ??
          json['name']?.toString() ?? '',
      code: json['church_code']?.toString() ??
          json['code']?.toString() ?? '',
      address: json['address']?.toString(),
      logoUrl: json['logo_url']?.toString() ??
          json['logoUrl']?.toString(),
      status: json['status']?.toString() ?? '',
    );
  }
}