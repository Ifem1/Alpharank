import importlib.util
import sys
import types
import unittest
from pathlib import Path


class _IdentityDecorator:
    def __call__(self, fn):
        return fn


class _Public:
    write = _IdentityDecorator()
    view = _IdentityDecorator()


class _FakeReturn:
    def __init__(self, calldata):
        self.calldata = calldata


class _FakeContract:
    pass


class _FakeTreeMap(dict):
    pass


fake_gl = types.SimpleNamespace(
    Contract=_FakeContract,
    TreeMap=_FakeTreeMap,
    public=_Public(),
    vm=types.SimpleNamespace(Return=_FakeReturn),
    message=types.SimpleNamespace(sender_address="0x0"),
    block=types.SimpleNamespace(timestamp=0),
)

fake_module = types.ModuleType("genlayer")
fake_module.gl = fake_gl
fake_module.u256 = int
fake_module.TreeMap = _FakeTreeMap
sys.modules.setdefault("genlayer", fake_module)

contract_path = Path(__file__).resolve().parents[1] / "contracts" / "AlphaRank.py"
spec = importlib.util.spec_from_file_location("alpharank_contract", contract_path)
alpharank_contract = importlib.util.module_from_spec(spec)
spec.loader.exec_module(alpharank_contract)


class ConsensusRuleTests(unittest.TestCase):
    def setUp(self):
        self.contract = alpharank_contract.AlphaRank()

    def fact_payload(self, credibility="medium", **overrides):
        payload = self.contract._default_fact_check()
        for key in alpharank_contract._FACT_LABEL_KEYS:
            payload[key] = "verified"
        payload["overall_credibility"] = credibility
        payload["red_flags"] = ["leader wording"]
        payload["verified_highlights"] = ["leader highlight"]
        payload["fact_check_summary"] = "leader prose"
        payload.update(overrides)
        return payload

    def score_payload(self, score=84, confidence=80, **overrides):
        payload = self.contract._default_score_payload()
        for key in (
            "technical_score",
            "team_score",
            "market_fit_score",
            "security_score",
            "execution_score",
            "token_utility_score",
        ):
            payload[key] = score
        payload["confidence"] = confidence
        payload.update(overrides)
        return payload

    def test_same_fact_labels_accept_even_with_different_prose(self):
        leader = self.fact_payload(red_flags=["leader"], fact_check_summary="leader text")
        validator = self.fact_payload(red_flags=["validator"], fact_check_summary="validator text")
        self.assertTrue(self.contract._fact_checks_equivalent(leader, validator))

    def test_different_fact_label_rejects(self):
        leader = self.fact_payload()
        validator = self.fact_payload(team_verifiable="disputed")
        self.assertFalse(self.contract._fact_checks_equivalent(leader, validator))

    def test_different_credibility_tier_rejects(self):
        leader = self.fact_payload(credibility="high")
        validator = self.fact_payload(credibility="medium")
        self.assertFalse(self.contract._fact_checks_equivalent(leader, validator))

    def test_malicious_wrong_leader_fact_result_rejects(self):
        leader = self.fact_payload(credibility="high", audit_reports_accessible="verified")
        validator = self.fact_payload(credibility="very_low", audit_reports_accessible="disputed")
        self.assertFalse(self.contract._fact_checks_equivalent(leader, validator))

    def test_leader_fact_payload_missing_required_label_rejects(self):
        leader = self.fact_payload()
        leader.pop("team_verifiable")
        validator = self.fact_payload()
        self.assertFalse(self.contract._fact_checks_equivalent(leader, validator))

    def test_validator_fact_payload_missing_required_label_rejects(self):
        leader = self.fact_payload()
        validator = self.fact_payload()
        validator.pop("team_verifiable")
        self.assertFalse(self.contract._fact_checks_equivalent(leader, validator))

    def test_invalid_fact_verdict_rejects(self):
        leader = self.fact_payload(team_verifiable="fetch_failed")
        validator = self.fact_payload()
        self.assertFalse(self.contract._fact_checks_equivalent(leader, validator))

    def test_invalid_credibility_tier_rejects(self):
        leader = self.fact_payload(credibility="excellent")
        validator = self.fact_payload()
        self.assertFalse(self.contract._fact_checks_equivalent(leader, validator))

    def test_malformed_leader_fact_json_cannot_default_to_valid_result(self):
        validator = self.fact_payload()
        self.assertFalse(self.contract._fact_checks_equivalent("not json", validator))

    def test_malformed_validator_fact_result_cannot_agree_with_valid_leader(self):
        leader = self.fact_payload()
        self.assertFalse(self.contract._fact_checks_equivalent(leader, "not json"))

    def test_fact_validator_callback_rejects_disagreement(self):
        leader = self.fact_payload(team_verifiable="verified")
        validator = self.fact_payload(team_verifiable="disputed")
        self.assertFalse(self.contract._fact_validator_accepts(_FakeReturn(leader), validator))

    def test_scores_in_same_band_accept(self):
        leader = self.score_payload(score=84, confidence=80)
        validator = self.score_payload(score=82, confidence=70)
        self.assertTrue(self.contract._scores_equivalent(leader, validator))

    def test_score_band_boundary_79_80_rejects(self):
        leader = self.score_payload(score=79)
        validator = self.score_payload(score=80)
        self.assertFalse(self.contract._scores_equivalent(leader, validator))

    def test_score_band_boundary_80_89_accepts(self):
        leader = self.score_payload(score=80)
        validator = self.score_payload(score=89)
        self.assertTrue(self.contract._scores_equivalent(leader, validator))

    def test_materially_different_score_band_rejects(self):
        leader = self.score_payload(score=84)
        validator = self.score_payload(score=62)
        self.assertFalse(self.contract._scores_equivalent(leader, validator))

    def test_malicious_wrong_leader_score_result_rejects(self):
        leader = self.score_payload(score=98, confidence=95)
        validator = self.score_payload(score=41, confidence=60)
        self.assertFalse(self.contract._scores_equivalent(leader, validator))

    def test_missing_score_dimension_rejects(self):
        leader = self.score_payload()
        leader.pop("technical_score")
        validator = self.score_payload()
        self.assertFalse(self.contract._scores_equivalent(leader, validator))

    def test_non_numeric_score_rejects(self):
        leader = self.score_payload(technical_score="high")
        validator = self.score_payload()
        self.assertFalse(self.contract._scores_equivalent(leader, validator))

    def test_score_above_100_rejects(self):
        leader = self.score_payload(technical_score=101)
        validator = self.score_payload()
        self.assertFalse(self.contract._scores_equivalent(leader, validator))

    def test_score_below_0_rejects(self):
        leader = self.score_payload(technical_score=-1)
        validator = self.score_payload()
        self.assertFalse(self.contract._scores_equivalent(leader, validator))

    def test_missing_confidence_rejects(self):
        leader = self.score_payload()
        leader.pop("confidence")
        validator = self.score_payload()
        self.assertFalse(self.contract._scores_equivalent(leader, validator))

    def test_malformed_leader_score_payload_cannot_default_to_valid_result(self):
        validator = self.score_payload()
        self.assertFalse(self.contract._scores_equivalent("not json", validator))

    def test_malformed_validator_score_result_cannot_agree_with_valid_leader(self):
        leader = self.score_payload()
        self.assertFalse(self.contract._scores_equivalent(leader, "not json"))

    def test_score_validator_callback_rejects_material_disagreement(self):
        leader = self.score_payload(technical_score=84)
        validator = self.score_payload(technical_score=62)
        self.assertFalse(self.contract._score_validator_accepts(_FakeReturn(leader), validator))

    def test_score_validator_callback_accepts_same_band_agreement(self):
        leader = self.score_payload(technical_score=84)
        validator = self.score_payload(technical_score=82)
        self.assertTrue(self.contract._score_validator_accepts(_FakeReturn(leader), validator))

    def test_very_low_credibility_caps_raw_score_above_60_to_exactly_60(self):
        raw = self.contract._calculate_final_score(95, 95, 95, 95, 95, 95)
        capped = self.contract._apply_credibility_cap(raw, "very_low")
        self.assertEqual(capped, 60)

    def test_low_credibility_caps_raw_73_to_60(self):
        self.assertEqual(self.contract._apply_credibility_cap(73, "low"), 60)

    def test_low_credibility_keeps_raw_55(self):
        self.assertEqual(self.contract._apply_credibility_cap(55, "low"), 55)

    def test_medium_credibility_does_not_cap_raw_95(self):
        self.assertEqual(self.contract._apply_credibility_cap(95, "medium"), 95)


if __name__ == "__main__":
    unittest.main()
