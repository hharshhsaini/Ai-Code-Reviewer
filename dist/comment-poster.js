"use strict";
/**
 * Comment Poster
 * Posts review comments to GitHub
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommentPoster = void 0;
class CommentPoster {
    /**
     * Format and post review comments
     */
    static async post(client, owner, repo, pullNumber, issues, verdict, summary) {
        // Format all issues as review comments
        const comments = issues.map(issue => this.formatComment(issue));
        // Map verdict to GitHub event type
        const event = this.verdictToEvent(verdict);
        // Post all comments in a single batched review
        await client.postReview(owner, repo, pullNumber, comments, event, summary);
    }
    /**
     * Format issue as review comment
     */
    static formatComment(issue) {
        const body = this.formatBody(issue);
        // If position is null, omit it (file-level comment)
        if (issue.position === null) {
            return {
                path: issue.file,
                body,
            };
        }
        // Otherwise, include position for inline comment
        return {
            path: issue.file,
            position: issue.position,
            body,
        };
    }
    /**
     * Format comment body with severity badge
     */
    static formatBody(issue) {
        // Get severity badge
        const badge = this.getSeverityBadge(issue.severity);
        // Start with badge and comment
        let body = `${badge}\n\n${issue.comment}`;
        // Add suggestion if present
        if (issue.suggestion) {
            body += `\n\n**Suggested fix:**\n\`\`\`\n${issue.suggestion}\n\`\`\``;
        }
        return body;
    }
    /**
     * Get severity badge markdown
     */
    static getSeverityBadge(severity) {
        const badges = {
            critical: '**🔴 CRITICAL**',
            warning: '**⚠️ WARNING**',
            suggestion: '**💡 SUGGESTION**',
        };
        return badges[severity];
    }
    /**
     * Map verdict to GitHub event type
     */
    static verdictToEvent(verdict) {
        const mapping = {
            approve: 'APPROVE',
            request_changes: 'REQUEST_CHANGES',
            comment: 'COMMENT',
        };
        return mapping[verdict];
    }
}
exports.CommentPoster = CommentPoster;
//# sourceMappingURL=comment-poster.js.map