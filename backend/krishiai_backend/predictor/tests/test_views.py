"""
predictor/tests/test_views.py
==============================
Tests for all KrishiAI API endpoints.

Run with:
    cd backend/krishiai_backend
    python manage.py test predictor
"""

import json
from django.test import Client, TestCase


VALID_PAYLOAD = {
    "N": 90, "P": 42, "K": 43,
    "pH": 6.5, "temperature": 21,
    "rainfall": 200, "humidity": 82,
}

VALID_CROPS_PAYLOAD = {
    "nitrogen": 90, "phosphorus": 42, "potassium": 43,
    "ph": 6.5, "temperature": 21,
    "rainfall": 200, "humidity": 82,
}


class HealthEndpointTests(TestCase):
    def setUp(self):
        self.client = Client()

    def test_health_returns_200_when_model_loaded(self):
        response = self.client.get("/health")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data["model_loaded"])
        self.assertTrue(data["encoder_loaded"])
        self.assertIn("crops", data)
        self.assertGreaterEqual(len(data["crops"]), 20)

    def test_health_available_at_versioned_path(self):
        response = self.client.get("/api/v1/health")
        self.assertEqual(response.status_code, 200)

    def test_health_available_at_api_path(self):
        response = self.client.get("/api/health")
        self.assertEqual(response.status_code, 200)


class PredictEndpointTests(TestCase):
    def setUp(self):
        self.client = Client()

    def _post(self, payload, path="/predict"):
        return self.client.post(
            path, data=json.dumps(payload), content_type="application/json"
        )

    def test_valid_payload_returns_prediction(self):
        response = self._post(VALID_PAYLOAD)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("crop", data)
        self.assertIn("confidence", data)
        self.assertIn("alternatives", data)
        self.assertIn("feature_importance", data)
        self.assertIsInstance(data["crop"], str)
        self.assertGreater(data["confidence"], 0)
        self.assertLessEqual(data["confidence"], 100)

    def test_rice_like_conditions_predict_rice(self):
        response = self._post(VALID_PAYLOAD)
        data = response.json()
        self.assertEqual(data["crop"], "Rice")

    def test_feature_importance_keys_match_api_fields(self):
        response = self._post(VALID_PAYLOAD)
        data = response.json()
        expected_keys = {"N", "P", "K", "pH", "temperature", "rainfall", "humidity"}
        self.assertEqual(set(data["feature_importance"].keys()), expected_keys)

    def test_missing_field_returns_400(self):
        payload = dict(VALID_PAYLOAD)
        del payload["N"]
        response = self._post(payload)
        self.assertEqual(response.status_code, 400)
        self.assertIn("error", response.json())

    def test_non_numeric_field_returns_400(self):
        payload = dict(VALID_PAYLOAD)
        payload["N"] = "not-a-number"
        response = self._post(payload)
        self.assertEqual(response.status_code, 400)

    def test_out_of_range_field_returns_400(self):
        payload = dict(VALID_PAYLOAD)
        payload["pH"] = 99
        response = self._post(payload)
        self.assertEqual(response.status_code, 400)
        self.assertIn("pH", response.json()["error"])

    def test_invalid_json_returns_400(self):
        response = self.client.post(
            "/predict", data="not-json", content_type="application/json"
        )
        self.assertEqual(response.status_code, 400)

    def test_get_method_not_allowed(self):
        response = self.client.get("/predict")
        self.assertEqual(response.status_code, 405)

    def test_predict_available_at_versioned_path(self):
        response = self._post(VALID_PAYLOAD, path="/api/v1/predict")
        self.assertEqual(response.status_code, 200)

    def test_options_request_succeeds_for_cors_preflight(self):
        response = self.client.options("/predict")
        self.assertEqual(response.status_code, 200)


class CropsRecommendEndpointTests(TestCase):
    """Tests for the frontend-native /crops/recommend endpoint."""
    def setUp(self):
        self.client = Client()

    def _post(self, payload, path="/crops/recommend"):
        return self.client.post(
            path, data=json.dumps(payload), content_type="application/json"
        )

    def test_valid_payload_returns_list(self):
        response = self._post(VALID_CROPS_PAYLOAD)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIsInstance(data, list)
        self.assertGreater(len(data), 0)

    def test_result_has_required_fields(self):
        response = self._post(VALID_CROPS_PAYLOAD)
        self.assertEqual(response.status_code, 200)
        crop = response.json()[0]
        for field in ["name", "confidence", "expected_yield", "water_requirement",
                      "growing_duration", "profitability", "best_sowing_month", "fertilizer"]:
            self.assertIn(field, crop, f"Missing field: {field}")

    def test_missing_field_returns_400(self):
        payload = dict(VALID_CROPS_PAYLOAD)
        del payload["nitrogen"]
        response = self._post(payload)
        self.assertEqual(response.status_code, 400)

    def test_available_at_versioned_path(self):
        response = self._post(VALID_CROPS_PAYLOAD, path="/api/v1/crops/recommend")
        self.assertEqual(response.status_code, 200)


class WeatherEndpointTests(TestCase):
    def setUp(self):
        self.client = Client()

    def test_valid_coords_return_weather_shape(self):
        response = self.client.get("/weather", {"lat": "22.57", "lon": "88.36"})
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("current", data)
        self.assertIn("hourly", data)
        self.assertIn("daily", data)
        current = data["current"]
        for field in ["temp", "humidity", "pressure", "wind_speed", "condition"]:
            self.assertIn(field, current)
        self.assertEqual(len(data["hourly"]), 24)
        self.assertEqual(len(data["daily"]), 7)

    def test_missing_coords_returns_400(self):
        response = self.client.get("/weather")
        self.assertEqual(response.status_code, 400)


class SoilEndpointTests(TestCase):
    def setUp(self):
        self.client = Client()

    def test_valid_coords_return_soil_shape(self):
        response = self.client.get("/soil", {"lat": "22.57", "lon": "88.36"})
        self.assertEqual(response.status_code, 200)
        data = response.json()
        for field in ["nitrogen", "phosphorus", "potassium", "ph", "moisture",
                      "organic_carbon", "health_score", "suggestions", "suitable_crops"]:
            self.assertIn(field, data)
        self.assertIsInstance(data["suggestions"], list)
        self.assertIsInstance(data["suitable_crops"], list)
        self.assertGreater(len(data["suitable_crops"]), 0)

    def test_missing_coords_returns_400(self):
        response = self.client.get("/soil")
        self.assertEqual(response.status_code, 400)


class SatelliteEndpointTests(TestCase):
    def setUp(self):
        self.client = Client()

    def test_valid_coords_return_satellite_shape(self):
        response = self.client.get("/satellite", {"lat": "22.57", "lon": "88.36"})
        self.assertEqual(response.status_code, 200)
        data = response.json()
        for field in ["ndvi", "vegetation_index", "crop_stress", "field_health"]:
            self.assertIn(field, data)
        self.assertGreaterEqual(data["ndvi"], 0)
        self.assertLessEqual(data["ndvi"], 1)

    def test_missing_coords_returns_400(self):
        response = self.client.get("/satellite")
        self.assertEqual(response.status_code, 400)


class MarketPricesEndpointTests(TestCase):
    def setUp(self):
        self.client = Client()

    def test_returns_price_list(self):
        response = self.client.get("/market/prices")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIsInstance(data, list)
        self.assertGreater(len(data), 0)
        for price in data:
            for field in ["crop", "today", "yesterday", "unit", "trend"]:
                self.assertIn(field, price)

    def test_state_filter_returns_prices(self):
        response = self.client.get("/market/prices", {"state": "West Bengal"})
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIsInstance(data, list)


class DiseaseEndpointTests(TestCase):
    def setUp(self):
        self.client = Client()

    def test_no_image_returns_400(self):
        response = self.client.post("/disease/predict")
        self.assertEqual(response.status_code, 400)
        self.assertIn("error", response.json())


class AuthEndpointTests(TestCase):
    def setUp(self):
        self.client = Client()

    def _post(self, path, payload):
        return self.client.post(
            path, data=json.dumps(payload), content_type="application/json"
        )

    def test_login_returns_token_and_user(self):
        response = self._post("/auth/login", {"email": "test@example.com", "password": "password123"})
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("token", data)
        self.assertIn("user", data)
        self.assertIn("email", data["user"])

    def test_login_missing_fields_returns_400(self):
        response = self._post("/auth/login", {"email": "test@example.com"})
        self.assertEqual(response.status_code, 400)

    def test_register_returns_token_and_user(self):
        response = self._post("/auth/register", {
            "name": "Test Farmer", "email": "new@example.com",
            "phone": "9876543210", "password": "securepass"
        })
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("token", data)
        self.assertIn("user", data)
        self.assertEqual(data["user"]["name"], "Test Farmer")

    def test_register_short_password_returns_400(self):
        response = self._post("/auth/register", {
            "name": "Test", "email": "test2@example.com",
            "phone": "9876543210", "password": "123"
        })
        self.assertEqual(response.status_code, 400)
