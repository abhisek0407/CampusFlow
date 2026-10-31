"""Load the dataset and apply disruption files. Never mutates the source file."""
import copy
import json
from pathlib import Path


def load_json(path):
    with open(Path(path), encoding="utf-8") as f:
        return json.load(f)


def load_dataset(path):
    return load_json(path)


def apply_disruption(data, disruption):
    """Return a NEW dataset with the disruption applied (mirrors validator.apply_disruption).

    Changes are permanent for later weeks, so they are merged into the base data.
    """
    d = copy.deepcopy(data)
    fac = {f["id"]: f for f in d["faculty"]}
    for ch in disruption.get("changes", []):
        t = ch["type"]
        if t == "faculty_unavailable":
            for day in ch["days"]:
                fac[ch["faculty_id"]]["unavailable"].append(
                    {"day": day, "periods": ch["periods"], "reason": ch.get("reason", "")})
        elif t == "room_unavailable":
            for day in ch["days"]:
                d["room_unavailability"].append(
                    {"room_id": ch["room_id"], "day": day, "periods": ch["periods"],
                     "reason": ch.get("reason", "")})
        elif t == "add_faculty":
            d["faculty"].append(ch["faculty"])
            fac[ch["faculty"]["id"]] = ch["faculty"]
        elif t == "add_session":
            d["sessions"].append(ch["session"])
        elif t == "remove_session":
            d["sessions"] = [s for s in d["sessions"] if s["id"] != ch["session_id"]]
        else:
            raise ValueError(f"Unknown change type: {t}")
    return d
