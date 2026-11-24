BEGIN;

CREATE TABLE post_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    church_id UUID NOT NULL,
    post_id UUID NOT NULL,
    membership_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT post_likes_post_fkey
        FOREIGN KEY (post_id, church_id)
        REFERENCES posts (id, church_id)
        ON DELETE CASCADE,

    CONSTRAINT post_likes_membership_fkey
        FOREIGN KEY (membership_id, church_id)
        REFERENCES church_memberships (id, church_id)
        ON DELETE CASCADE,

    CONSTRAINT post_likes_one_per_member
        UNIQUE (church_id, post_id, membership_id)
);

CREATE INDEX post_likes_membership_lookup_idx
    ON post_likes (membership_id, created_at DESC);

COMMIT;
