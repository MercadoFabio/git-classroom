/**
 * Shared GitHub API utilities — UTN Classroom Helper
 */
const GITHUB_API = {
    VERSION: '2022-11-28',
    headers(token) {
        return {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/vnd.github+json',
            'X-GitHub-Api-Version': this.VERSION
        };
    },
    async getClassrooms(token) {
        const res = await fetch('https://api.github.com/classrooms', { headers: this.headers(token) });
        if (!res.ok) throw new Error('Token inválido o sin acceso a classrooms.');
        return res.json();
    },
    async getAssignments(classroomId, token) {
        const res = await fetch(
            `https://api.github.com/classrooms/${classroomId}/assignments?per_page=100`,
            { headers: this.headers(token) }
        );
        if (!res.ok) throw new Error('Error al obtener assignments.');
        const data = await res.json();
        return data.sort((a, b) => a.id - b.id);
    },
    async getAllGrades(assignments, token) {
        const promises = assignments.map(asg =>
            fetch(`https://api.github.com/assignments/${asg.id}/grades`, { headers: this.headers(token) })
                .then(r => r.ok ? r.json() : [])
                .catch(() => [])
        );
        return Promise.all(promises);
    },
    async enrichGradesWithCommits(baseGrades, token, onProgress) {
        const hdrs = this.headers(token);
        let done = 0;
        const total = baseGrades.reduce((s, g) => s + g.length, 0);
        const promises = baseGrades.map(gradesForAssignment =>
            Promise.all((gradesForAssignment || []).map(async student => {
                if (!student.student_repository_url) { onProgress && onProgress(++done, total); return student; }
                try {
                    const url = new URL(student.student_repository_url);
                    const [, owner, repo] = url.pathname.split('/');
                    const res = await fetch(
                        `https://api.github.com/repos/${owner}/${repo}/commits?per_page=1`,
                        { headers: hdrs }
                    );
                    if (res.ok) {
                        const commits = await res.json();
                        if (commits.length > 0 && commits[0].author?.login === student.github_username) {
                            student.submission_timestamp = commits[0].commit.author.date;
                        }
                    }
                } catch {}
                onProgress && onProgress(++done, total);
                return student;
            }))
        );
        return Promise.all(promises);
    }
};
