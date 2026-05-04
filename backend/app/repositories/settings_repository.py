"""Settings repository — abstract interface."""

from typing import Dict, Optional


class SettingsRepository:
    """Abstract settings repository.

    Settings behave as a single logical record, so the interface is
    simplified to get and update operations.
    """

    def get_settings(self) -> Optional[Dict]:
        """Return the current settings record, or None if not yet created."""
        raise NotImplementedError

    def update_settings(self, payload: Dict) -> Optional[Dict]:
        """Merge *payload* into the existing settings record.

        Creates the record if it does not yet exist.
        Returns the full updated record, or None on failure.
        """
        raise NotImplementedError
