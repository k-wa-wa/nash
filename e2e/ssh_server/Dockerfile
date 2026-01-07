FROM lscr.io/linuxserver/openssh-server:latest

# We just use the basic image which supports user/pass via config or env
# But linuxserver/openssh-server is good. Or just alpine.

# Let's use simple alpine Config
FROM alpine:latest

RUN apk add --no-cache openssh

# Generate host keys
RUN ssh-keygen -A

# Add user
RUN echo 'root:root' | chpasswd
RUN adduser -D testuser && echo 'testuser:testpass' | chpasswd

# Access config
RUN echo "PermitRootLogin yes" >> /etc/ssh/sshd_config
RUN echo "PasswordAuthentication yes" >> /etc/ssh/sshd_config

EXPOSE 22

CMD ["/usr/sbin/sshd", "-D"]
