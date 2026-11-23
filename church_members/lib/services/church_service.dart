import '../core/network/api_client.dart';
import '../models/church_model.dart';

class ChurchService {
  final ApiClient _apiClient;

  ChurchService(this._apiClient);

  Future<List<ChurchModel>> getActiveChurches() async {
    final response = await _apiClient.get('/churches/public/active');

    final dynamic responseData =
        response is Map ? response['data'] : null;

    if (responseData is! List) {
      throw Exception('The server returned an invalid church list.');
    }

    return responseData
        .whereType<Map>()
        .map(
          (church) => ChurchModel.fromJson(
            Map<String, dynamic>.from(church),
          ),
        )
        .toList();
  }
}