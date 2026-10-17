from types import SimpleNamespace

from app.models.export_document import ExportDocument


def _shipment(packing_list_net_weight: float | None, *net_weights: float, override_by: str | None = None):
    bundles = [SimpleNamespace(net_weight=weight) for weight in net_weights]
    return SimpleNamespace(
        packing_list_net_weight=packing_list_net_weight,
        net_weight_override_by=override_by,
        batches=[SimpleNamespace(sticker_batch=SimpleNamespace(bundles=bundles))],
    )


def _check(shipment, name: str):
    prop = getattr(ExportDocument, name)
    if name == "net_weight_matches":
        shipment.stickers_net_weight = ExportDocument.stickers_net_weight.fget(shipment)
    if name == "net_weight_cleared":
        shipment.stickers_net_weight = ExportDocument.stickers_net_weight.fget(shipment)
        shipment.net_weight_matches = ExportDocument.net_weight_matches.fget(shipment)
    return prop.fget(shipment)


def test_sticker_total_matching_packing_list_clears_check() -> None:
    shipment = _shipment(2400.0, 1200.0, 1200.2)
    assert _check(shipment, "stickers_net_weight") == 2400.2
    assert _check(shipment, "net_weight_matches") is True
    assert _check(shipment, "net_weight_cleared") is True


def test_mismatch_blocks_until_admin_overrides() -> None:
    shipment = _shipment(2500.0, 1200.0, 1200.0)
    assert _check(shipment, "net_weight_matches") is False
    assert _check(shipment, "net_weight_cleared") is False

    shipment = _shipment(2500.0, 1200.0, 1200.0, override_by="admin@example.test")
    assert _check(shipment, "net_weight_cleared") is True


def test_missing_packing_list_weight_never_matches() -> None:
    assert _check(_shipment(None, 1200.0), "net_weight_matches") is False
