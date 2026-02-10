export const ISSUE_CREATE_MUTATION = `
  mutation IssueCreate($input: IssueCreateInput!) {
    issueCreate(input: $input) {
      success
      issue {
        id
        identifier
        url
      }
    }
  }
`;

export const WORKSPACE_RESOURCES_QUERY = `
  query WorkspaceResources {
    viewer {
      name
      organization {
        name
      }
    }
    teams {
      nodes {
        id
        key
        name
        states {
          nodes {
            id
            type
          }
        }
        memberships {
          nodes {
            user {
              id
            }
          }
        }
      }
    }
    projects {
      nodes {
        id
        name
        teams {
          nodes {
            id
          }
        }
      }
    }
    issueLabels {
      nodes {
        id
        name
        color
        isGroup
        parent {
          id
        }
        team {
          id
        }
      }
    }
    users {
      nodes {
        id
        name
        displayName
        active
        avatarUrl
      }
    }
  }
`;

export const WORKSPACE_RESOURCES_FALLBACK_QUERY = `
  query WorkspaceResourcesFallback {
    viewer {
      name
    }
    teams {
      nodes {
        id
        key
        name
        states {
          nodes {
            id
            type
          }
        }
        memberships {
          nodes {
            user {
              id
            }
          }
        }
      }
    }
    projects {
      nodes {
        id
        name
        teams {
          nodes {
            id
          }
        }
      }
    }
    issueLabels {
      nodes {
        id
        name
        color
        isGroup
        parent {
          id
        }
        team {
          id
        }
      }
    }
    users {
      nodes {
        id
        name
        displayName
        active
        avatarUrl
      }
    }
  }
`;
