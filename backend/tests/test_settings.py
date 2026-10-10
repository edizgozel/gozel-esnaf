def test_settings_initial_empty_business_name(client):
    res = client.get("/api/v1/settings")
    assert res.status_code == 200
    data = res.json()
    assert data["business_name"] == ""
    assert data["currency_code"] == "TRY"
    assert data["currency_symbol"] == "₺"
    assert data["phone"] is None
    assert data["email"] is None
    assert data["address"] is None
    assert data["tax_id"] is None


def test_settings_update_and_persistence(client):
    payload = {
        "business_name": "Gozel Ticaret Ltd. Şti.",
        "phone": "05551112233",
        "email": "info@gozelticaret.com",
        "address": "Kadıköy, İstanbul",
        "currency_code": "TRY",
        "currency_symbol": "₺",
        "tax_id": "1234567890",
        "note_footer": "İyi günler dileriz.",
    }
    update_res = client.put("/api/v1/settings", json=payload)
    assert update_res.status_code == 200
    updated_data = update_res.json()
    assert updated_data["business_name"] == "Gozel Ticaret Ltd. Şti."
    assert updated_data["phone"] == "05551112233"
    assert updated_data["tax_id"] == "1234567890"

    get_res = client.get("/api/v1/settings")
    assert get_res.status_code == 200
    persisted_data = get_res.json()
    assert persisted_data["business_name"] == "Gozel Ticaret Ltd. Şti."
    assert persisted_data["phone"] == "05551112233"
    assert persisted_data["email"] == "info@gozelticaret.com"
    assert persisted_data["address"] == "Kadıköy, İstanbul"

